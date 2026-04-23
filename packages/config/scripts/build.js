import ts from "typescript"
import fs from "node:fs"
import path from "node:path"

const args = process.argv.slice(2)
const flags = args.filter(a => a.startsWith("--"))
const positional = args.filter(a => !a.startsWith("--"))

const [inputFile, entryType, outputFile] = positional

if (!inputFile || !entryType || !outputFile) {
    console.error("Usage: node build.js <input.d.ts> <EntryType> <output.json> [--skip-props=a,b] [--jsonforms]")
    process.exit(1)
}

const skipProps = new Set(
    flags.find(f => f.startsWith("--skip-props="))
        ?.replace("--skip-props=", "")
        .split(",")
        .map(s => s.trim()) ?? []
)

const jsonformsMode = flags.includes("--jsonforms")

const program = ts.createProgram([path.resolve(inputFile)], {
    strict: true,
    noEmit: true,
})
const checker = program.getTypeChecker()

const sourceFile = program.getSourceFile(path.resolve(inputFile))
if (!sourceFile) {
    console.error(`Cannot find source file: ${inputFile}`)
    process.exit(1)
}

const exportedSymbols = new Map()

checker.getSymbolAtLocation(sourceFile)
    ?.exports
    ?.forEach((sym, name) => exportedSymbols.set(String(name), sym))

sourceFile.statements.forEach((stmt) => {
    if (ts.isInterfaceDeclaration(stmt) || ts.isTypeAliasDeclaration(stmt)) {
        const sym = checker.getSymbolAtLocation(stmt.name)
        if (sym) exportedSymbols.set(stmt.name.text, sym)
    }
})

const entrySym = exportedSymbols.get(entryType)
if (!entrySym) {
    console.error(`Type "${entryType}" not found. Available: ${[...exportedSymbols.keys()].join(", ")}`)
    process.exit(1)
}

const definitionNames = new Map()
const definitions = {}
const inProgress = new Set()

function getDescription(sym) {
    const comment = sym.getDocumentationComment(checker)
    const text = ts.displayPartsToString(comment).trim()
    return text || undefined
}

function getJSDocTag(sym, tagName) {
    const tags = sym.getJsDocTags(checker)
    const tag = tags.find(t => t.name === tagName)
    if (!tag) return undefined
    return ts.displayPartsToString(tag.text ?? []).trim() || undefined
}

function getShortDescription(sym) {
    return getJSDocTag(sym, "shortDescription")
}

function getDefault(sym) {
    const raw = getJSDocTag(sym, "default")
    if (raw === undefined) return undefined
    try { return JSON.parse(raw) } catch { return raw }
}

function getExamples(sym) {
    const tags = sym.getJsDocTags(checker)
    const examples = tags
        .filter(t => t.name === "example")
        .map(t => {
            const raw = ts.displayPartsToString(t.text ?? []).trim()
            try { return JSON.parse(raw) } catch { return raw }
        })
    return examples.length ? examples : undefined
}

function typeToSchema(type, sym) {
    if (type.getCallSignatures().length > 0) {
        return { type: "object", properties: {}, description: sym ? getDescription(sym) : undefined }
    }

    const flags = type.flags
    if (flags & ts.TypeFlags.Any || flags & ts.TypeFlags.Unknown) return {}
    if (flags & ts.TypeFlags.Never) return { not: {} }
    if (flags & (ts.TypeFlags.Void | ts.TypeFlags.Undefined)) return { type: "null" }
    if (flags & ts.TypeFlags.Null) return { type: "null" }

    if (flags & ts.TypeFlags.BooleanLiteral) {
        return { type: "boolean", const: type.intrinsicName === "true" }
    }

    if (flags & ts.TypeFlags.StringLiteral) {
        return { type: "string", const: type.value }
    }

    if (flags & ts.TypeFlags.NumberLiteral) {
        return { type: "number", const: type.value }
    }

    if (flags & ts.TypeFlags.String) return { type: "string" }
    if (flags & ts.TypeFlags.Number) return { type: "number" }
    if (flags & ts.TypeFlags.Boolean) return { type: "boolean" }

    if (type.isUnion()) return unionToSchema(type, sym)
    if (type.isIntersection()) return intersectionToSchema(type)

    const sym_ = type.aliasSymbol ?? type.getSymbol()
    if (sym_ && isNamedDefinable(sym_, type)) return refOrInline(sym_, type)

    if (type.flags & ts.TypeFlags.Object) return objectToSchema(type)

    return {}
}

function isNamedDefinable(sym, type) {
    const decl = sym.declarations?.[0]
    if (!decl) return false
    return ts.isInterfaceDeclaration(decl) || ts.isTypeAliasDeclaration(decl)
}

function refOrInline(sym, type) {
    if (definitionNames.has(sym)) {
        return { $ref: `#/definitions/${definitionNames.get(sym)}` }
    }

    if (inProgress.has(sym)) {
        return { $ref: `#/definitions/${sym.name}` }
    }

    const name = sym.name
    definitionNames.set(sym, name)
    inProgress.add(sym)
    definitions[name] = objectToSchema(type)
    inProgress.delete(sym)
    return { $ref: `#/definitions/${name}` }
}

function unionToSchema(type, sym) {
    const members = type.types
    const nonNullable = members.filter(
        m => !(m.flags & (ts.TypeFlags.Null | ts.TypeFlags.Undefined | ts.TypeFlags.Void))
    )

    if (nonNullable.length === 0) return { type: "null" }
    if (nonNullable.length === 1) return typeToSchema(nonNullable[0], sym)

    const allBoolLiterals = nonNullable.every(m => m.flags & ts.TypeFlags.BooleanLiteral)
    if (allBoolLiterals) return { type: "boolean" }

    if (nonNullable.every(m => m.flags & (ts.TypeFlags.StringLiteral | ts.TypeFlags.NumberLiteral))) {
        const seen = new Set()
        const values = nonNullable
            .map(m => m.flags & ts.TypeFlags.StringLiteral ? m.value : m.value)
            .filter(v => {
                if (seen.has(v)) return false
                seen.add(v)
                return true
            })
        const baseType = nonNullable[0].flags & ts.TypeFlags.StringLiteral ? "string" : "number"
        return { type: baseType, enum: values }
    }

    if (jsonformsMode) {
        const objectVariants = nonNullable.filter(m => m.flags & ts.TypeFlags.Object)
        const boolLike = nonNullable.filter(m => m.flags & (ts.TypeFlags.Boolean | ts.TypeFlags.BooleanLiteral))
        if (objectVariants.length > 0 && boolLike.length > 0 &&
            objectVariants.length + boolLike.length === nonNullable.length) {
            return typeToSchema(objectVariants[0], sym)
        }

        const stringLitVariants = nonNullable.filter(m => m.flags & ts.TypeFlags.StringLiteral)
        if (objectVariants.length > 0 && stringLitVariants.length > 0 &&
            objectVariants.length + stringLitVariants.length === nonNullable.length) {
            return typeToSchema(objectVariants[0], sym)
        }

        const arrayVariants = nonNullable.filter(m => m.getSymbol()?.name === "Array")
        const emptyStringVariants = nonNullable.filter(
            m => (m.flags & ts.TypeFlags.StringLiteral) && m.value === ""
        )
        if (arrayVariants.length > 0 && emptyStringVariants.length > 0 &&
            arrayVariants.length + emptyStringVariants.length === nonNullable.length) {
            return typeToSchema(arrayVariants[0], sym)
        }
    }

    const schemas = nonNullable.map(m => typeToSchema(m, undefined))
    const deduped = deduplicateSchemas(schemas)
    if (deduped.length === 1) return deduped[0]
    return { anyOf: deduped }
}

function deduplicateSchemas(schemas) {
    const seen = new Set()
    return schemas.filter(s => {
        const k = JSON.stringify(s)
        if (seen.has(k)) return false
        seen.add(k)
        return true
    })
}

function intersectionToSchema(type) {
    const merged = {}
    const required = new Set()
    let description

    for (const member of type.types) {
        const schema = typeToSchema(member, undefined)
        if (schema.$ref) {
            const refName = schema.$ref.replace("#/definitions/", "")
            const def = definitions[refName]
            if (def?.properties) {
                Object.assign(merged, def.properties)
                for (const r of def.required ?? []) required.add(r)
            }
        } else if (schema.properties) {
            Object.assign(merged, schema.properties)
            for (const r of schema.required ?? []) required.add(r)
            if (!description && schema.description) description = schema.description
        }
    }

    return {
        type: "object",
        ...(description ? { description } : {}),
        properties: merged,
        ...(required.size ? { required: [...required] } : {}),
        additionalProperties: false,
    }
}

function objectToSchema(type) {
    const indexInfo = checker.getIndexInfoOfType(type, ts.IndexKind.Number)
    if (indexInfo) {
        const itemSchema = typeToSchema(indexInfo.type, undefined)
        return { type: "array", items: itemSchema }
    }

    const typeArgs = checker.getTypeArguments(type)
    if (type.getSymbol()?.name === "Array" || type.getSymbol()?.name === "ReadonlyArray") {
        const itemSchema = typeArgs.length ? typeToSchema(typeArgs[0], undefined) : {}
        return { type: "array", items: itemSchema }
    }

    const properties = checker.getPropertiesOfType(type)
    if (!properties.length) {
        return { type: "object", additionalProperties: true }
    }

    const props = {}
    const required = []

    for (const prop of properties) {
        if (skipProps.has(prop.name)) continue

        const propType = checker.getTypeOfSymbol(prop)
        if (propType.getCallSignatures().length > 0) continue

        const schema = typeToSchema(propType, prop)
        const description = getDescription(prop)
        const shortDescription = getShortDescription(prop)
        const defaultVal = getDefault(prop)
        const examples = getExamples(prop)
        const deprecated = getJSDocTag(prop, "deprecated")

        const annotated = {
            ...(description ? { description } : {}),
            ...(shortDescription ? { "x-shortDescription": shortDescription } : {}),
            ...(defaultVal !== undefined ? { default: defaultVal } : {}),
            ...(examples ? { examples } : {}),
            ...(deprecated ? { deprecated: true, description: [description, `@deprecated ${deprecated}`].filter(Boolean).join("\n") } : {}),
            ...schema,
        }

        if (description && schema.description && description !== schema.description) {
            annotated.description = description
        }

        props[prop.name] = annotated

        const isOptional = prop.flags & ts.SymbolFlags.Optional
        if (!isOptional) required.push(prop.name)
    }

    return {
        type: "object",
        properties: props,
        ...(required.length ? { required } : {}),
        additionalProperties: false,
    }
}

const entryType_ = checker.getDeclaredTypeOfSymbol(entrySym)
let rootSchema = typeToSchema(entryType_, entrySym)

if (rootSchema.$ref && typeof rootSchema.$ref === "string") {
    const refName = rootSchema.$ref.replace("#/definitions/", "")
    if (definitions[refName]) {
        rootSchema = definitions[refName]
    }
}

const output = {
    $schema: "http://json-schema.org/draft-07/schema#",
    ...rootSchema,
    ...(Object.keys(definitions).length ? { definitions } : {}),
}

fs.mkdirSync(path.dirname(outputFile), { recursive: true })
fs.writeFileSync(outputFile, JSON.stringify(output, null, 2))

const srcTypesFile = path.resolve("src/config.d.ts")
const distTypesFile = path.resolve("dist/config.d.ts")
fs.copyFileSync(srcTypesFile, distTypesFile)

console.log(`✓ Written to ${outputFile}`)
console.log(`✓ Copied to ${distTypesFile}`)
console.log(`  Root type:   ${entryType}`)
console.log(`  Definitions: ${Object.keys(definitions).join(", ") || "(none)"}`)
