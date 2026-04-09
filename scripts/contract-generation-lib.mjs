import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const contractsRoot = path.join(projectRoot, "contracts", "source");
const manifestsRoot = path.join(contractsRoot, "manifests");
const schemasRoot = path.join(contractsRoot, "schemas");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function listJsonFiles(rootDir) {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const entryPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      return listJsonFiles(entryPath);
    }
    return entry.name.endsWith(".json") ? [entryPath] : [];
  });
}

function schemaPropertyKeys(schema) {
  if (!schema || typeof schema !== "object" || !schema.properties) {
    return [];
  }
  return Object.keys(schema.properties);
}

function collectDefaults(schema, registry) {
  if (!schema || typeof schema !== "object") {
    return undefined;
  }
  if (schema.$ref) {
    return collectDefaults(registry.get(schema.$ref), registry);
  }
  if (Object.prototype.hasOwnProperty.call(schema, "default")) {
    return schema.default;
  }
  if (schema.type === "object" && schema.properties) {
    const objectValue = {};
    let hasDefaults = false;
    for (const [key, property] of Object.entries(schema.properties)) {
      const propertyDefault = collectDefaults(property, registry);
      if (propertyDefault !== undefined) {
        objectValue[key] = propertyDefault;
        hasDefaults = true;
      }
    }
    return hasDefaults ? objectValue : undefined;
  }
  return undefined;
}

function phpScalar(value, indentLevel = 0) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : String(value);
  if (typeof value === "string") return `'${value.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;
  if (Array.isArray(value)) {
    const indent = "\t".repeat(indentLevel);
    const innerIndent = "\t".repeat(indentLevel + 1);
    if (value.length === 0) return "array()";
    const items = value.map((item) => `${innerIndent}${phpScalar(item, indentLevel + 1)}`);
    return `array(\n${items.join(",\n")}\n${indent})`;
  }
  const indent = "\t".repeat(indentLevel);
  const innerIndent = "\t".repeat(indentLevel + 1);
  const entries = Object.entries(value);
  if (entries.length === 0) return "array()";
  const items = entries.map(
    ([key, item]) => `${innerIndent}${phpScalar(key)} => ${phpScalar(item, indentLevel + 1)}`
  );
  return `array(\n${items.join(",\n")}\n${indent})`;
}

function tsLiteral(value, indentLevel = 0) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    const indent = "  ".repeat(indentLevel);
    const innerIndent = "  ".repeat(indentLevel + 1);
    if (value.length === 0) return "[]";
    const items = value.map((item) => `${innerIndent}${tsLiteral(item, indentLevel + 1)}`);
    return `[\n${items.join(",\n")}\n${indent}]`;
  }
  const indent = "  ".repeat(indentLevel);
  const innerIndent = "  ".repeat(indentLevel + 1);
  const entries = Object.entries(value);
  if (entries.length === 0) return "{}";
  const items = entries.map(
    ([key, item]) => `${innerIndent}${JSON.stringify(key)}: ${tsLiteral(item, indentLevel + 1)}`
  );
  return `{\n${items.join(",\n")}\n${indent}}`;
}

function titleFor(schema, registry) {
  if (schema.$ref) {
    return titleFor(registry.get(schema.$ref), registry);
  }
  return schema.title;
}

function tsType(schema, registry) {
  if (schema.$ref) {
    return titleFor(registry.get(schema.$ref), registry);
  }
  if (Array.isArray(schema.type)) {
    return schema.type.map((typeName) => tsType({ ...schema, type: typeName }, registry)).join(" | ");
  }
  if (schema.enum) {
    return schema.enum.map((value) => JSON.stringify(value)).join(" | ");
  }
  if (schema.type === "null") return "null";
  if (schema.type === "string") return "string";
  if (schema.type === "integer" || schema.type === "number") return "number";
  if (schema.type === "boolean") return "boolean";
  if (schema.type === "array") {
    const itemType = schema.items ? tsType(schema.items, registry) : "unknown";
    return `Array<${itemType}>`;
  }
  if (schema.type === "object") {
    if (schema.properties) {
      const required = new Set(schema.required ?? []);
      const lines = Object.entries(schema.properties).map(([key, property]) => {
        const optional = required.has(key) ? "" : "?";
        return `${JSON.stringify(key)}${optional}: ${tsType(property, registry)};`;
      });
      if (schema.additionalProperties && schema.additionalProperties !== false) {
        const valueType =
          schema.additionalProperties === true
            ? "unknown"
            : tsType(schema.additionalProperties, registry);
        lines.push(`[key: string]: ${valueType};`);
      }
      return `{\n${lines.map((line) => `  ${line}`).join("\n")}\n}`;
    }
    if (schema.additionalProperties && schema.additionalProperties !== false) {
      const valueType =
        schema.additionalProperties === true
          ? "unknown"
          : tsType(schema.additionalProperties, registry);
      return `Record<string, ${valueType}>`;
    }
    return "Record<string, never>";
  }
  return "unknown";
}

function emitTsSchema(schema, registry) {
  const resolved = schema.$ref ? registry.get(schema.$ref) : schema;
  if (resolved.type === "object" && resolved.properties) {
    return `export interface ${resolved.title} ${tsType(resolved, registry)}`;
  }
  return `export type ${resolved.title} = ${tsType(resolved, registry)};`;
}

function collectSchemaRefs(schema, refs = new Set()) {
  if (!schema || typeof schema !== "object") {
    return refs;
  }
  if (schema.$ref) {
    refs.add(schema.$ref);
    return refs;
  }
  if (schema.items) {
    collectSchemaRefs(schema.items, refs);
  }
  if (schema.properties) {
    for (const property of Object.values(schema.properties)) {
      collectSchemaRefs(property, refs);
    }
  }
  if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
    collectSchemaRefs(schema.additionalProperties, refs);
  }
  return refs;
}

function buildContext() {
  const permissionsManifest = readJson(path.join(manifestsRoot, "permissions.json"));
  const featureFlagsManifest = readJson(path.join(manifestsRoot, "feature-flags.json"));
  const routesManifest = readJson(path.join(manifestsRoot, "routes.json"));
  const schemaFiles = listJsonFiles(schemasRoot);
  const schemas = schemaFiles.map((filePath) => readJson(filePath));
  const registry = new Map(schemas.map((schema) => [schema.$id, schema]));
  const routeContracts = {};

  for (const [routePath, route] of Object.entries(routesManifest.routes)) {
    const responseSchema = route.responseSchema ? registry.get(route.responseSchema) : null;
    const requestSchema = route.requestSchema ? registry.get(route.requestSchema) : null;
    routeContracts[routePath] = {
      name: route.name,
      methods: route.methods,
      permission: route.permission,
      featureFlag: route.featureFlag ?? null,
      requestSchema: route.requestSchema ?? null,
      requestKeys: schemaPropertyKeys(requestSchema),
      responseSchema: route.responseSchema ?? null,
      responseKeys: schemaPropertyKeys(responseSchema)
    };
  }

  return {
    featureFlagsManifest,
    permissionsManifest,
    registry,
    routeContracts,
    routesManifest,
    schemas
  };
}

function emitFiles(context) {
  const bootSchema = context.registry.get("boot/wp-react-ui");
  const earlyBootSchema = context.registry.get("boot/wp-react-ui-early-boot");
  const dtoSchemas = context.schemas.filter((schema) => schema.$id.startsWith("dto/"));
  const bootRefs = new Set([...collectSchemaRefs(bootSchema), ...collectSchemaRefs(earlyBootSchema)]);
  const bootDtoImports = [...bootRefs]
    .filter((ref) => ref.startsWith("dto/"))
    .map((ref) => titleFor(context.registry.get(ref), context.registry))
    .filter(Boolean)
    .sort();
  const featureDefaults = Object.fromEntries(
    Object.entries(context.featureFlagsManifest.flags).map(([key, value]) => [key, value.default])
  );
  const routePathsByName = Object.fromEntries(
    Object.entries(context.routeContracts).map(([routePath, route]) => [route.name, routePath])
  );

  const files = new Map();

  files.set(
    "src/generated/contracts/permissions.ts",
    `// AUTO-GENERATED from contracts/source. Do not edit.\n\nexport const PERMISSIONS = ${tsLiteral(
      context.permissionsManifest.permissions,
      0
    )} as const;\n\nexport type PermissionKey = keyof typeof PERMISSIONS;\n`
  );

  files.set(
    "src/generated/contracts/featureFlags.ts",
    `// AUTO-GENERATED from contracts/source. Do not edit.\n\nexport const FEATURE_FLAGS = ${tsLiteral(
      context.featureFlagsManifest.flags,
      0
    )} as const;\n\nexport type FeatureFlagKey = keyof typeof FEATURE_FLAGS;\n\nexport const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagKey, boolean> = ${tsLiteral(
      featureDefaults,
      0
    )};\n`
  );

  files.set(
    "src/generated/contracts/routes.ts",
    `// AUTO-GENERATED from contracts/source. Do not edit.\n\nexport const REST_NAMESPACE = ${JSON.stringify(
      context.routesManifest.namespace
    )} as const;\n\nexport const REST_ROUTE_CONTRACTS = ${tsLiteral(context.routeContracts, 0)} as const;\n\nexport type PluginRestPath = keyof typeof REST_ROUTE_CONTRACTS;\n\nexport const PLUGIN_ROUTE_PATHS = ${tsLiteral(
      routePathsByName,
      0
    )} as const satisfies Record<string, PluginRestPath>;\n`
  );

  files.set(
    "src/generated/contracts/dto.ts",
    `// AUTO-GENERATED from contracts/source. Do not edit.\n\n${dtoSchemas
      .map((schema) => emitTsSchema(schema, context.registry))
      .join("\n\n")}\n`
  );

  files.set(
    "src/generated/contracts/boot.ts",
    `// AUTO-GENERATED from contracts/source. Do not edit.\n\n${
      bootDtoImports.length > 0
        ? `import type { ${bootDtoImports.join(", ")} } from "./dto";\n\n`
        : ""
    }${emitTsSchema(bootSchema, context.registry)}\n\nexport type WpReactUiBranding = WpReactUiConfig["branding"];\nexport type WpReactUiBrandingLogos = WpReactUiConfig["branding"]["logos"];\nexport type WpReactUiNavigationConfig = WpReactUiConfig["navigation"];\nexport type WpReactUiUser = WpReactUiConfig["user"];\nexport type WpReactUiShellRoute = WpReactUiConfig["shellRoutes"][number];\n\n${emitTsSchema(
      earlyBootSchema,
      context.registry
    )}\n\nexport type ContractWindowShape<T> = T extends Array<infer TItem>\n  ? Array<TItem>\n  : T extends object\n    ? { [K in keyof T]?: ContractWindowShape<T[K]> }\n    : T;\n\nexport type WpReactUiWindowConfig = ContractWindowShape<WpReactUiConfig>;\nexport type WpReactUiWindowBootConfig = ContractWindowShape<WpReactUiBootConfig>;\n\nexport const BOOT_PAYLOAD_TOP_LEVEL_KEYS = ${tsLiteral(
      schemaPropertyKeys(bootSchema),
      0
    )} as const;\nexport const BOOT_PAYLOAD_BRANDING_KEYS = ${tsLiteral(
      schemaPropertyKeys(bootSchema.properties.branding),
      0
    )} as const;\nexport const BOOT_PAYLOAD_BRANDING_LOGO_KEYS = ${tsLiteral(
      schemaPropertyKeys(bootSchema.properties.branding.properties.logos),
      0
    )} as const;\nexport const BOOT_PAYLOAD_NAVIGATION_KEYS = ${tsLiteral(
      schemaPropertyKeys(bootSchema.properties.navigation),
      0
    )} as const;\nexport const BOOT_PAYLOAD_USER_KEYS = ${tsLiteral(
      schemaPropertyKeys(bootSchema.properties.user),
      0
    )} as const;\nexport const SHELL_ROUTE_KEYS = ${tsLiteral(
      schemaPropertyKeys(bootSchema.properties.shellRoutes.items),
      0
    )} as const;\n\nexport const DEFAULT_WP_REACT_UI_BOOT_CONFIG: WpReactUiBootConfig = ${tsLiteral(
      collectDefaults(earlyBootSchema, context.registry),
      0
    )};\n`
  );

  files.set(
    "src/generated/contracts/index.ts",
    `export * from "./boot";\nexport * from "./dto";\nexport * from "./featureFlags";\nexport * from "./permissions";\nexport * from "./routes";\n`
  );

  files.set(
    "app/Contracts/Generated/Permissions.php",
    `<?php\n/**\n * AUTO-GENERATED from contracts/source. Do not edit.\n */\n\ndeclare(strict_types=1);\n\nnamespace WpReactUi\\Contracts\\Generated;\n\nfinal class Permissions {\n\tpublic const MAP = ${phpScalar(
      context.permissionsManifest.permissions,
      1
    )};\n}\n`
  );

  files.set(
    "app/Contracts/Generated/FeatureFlags.php",
    `<?php\n/**\n * AUTO-GENERATED from contracts/source. Do not edit.\n */\n\ndeclare(strict_types=1);\n\nnamespace WpReactUi\\Contracts\\Generated;\n\nfinal class FeatureFlags {\n\tpublic const FLAGS = ${phpScalar(
      context.featureFlagsManifest.flags,
      1
    )};\n\n\tpublic const DEFAULTS = ${phpScalar(featureDefaults, 1)};\n}\n`
  );

  files.set(
    "app/Contracts/Generated/Routes.php",
    `<?php\n/**\n * AUTO-GENERATED from contracts/source. Do not edit.\n */\n\ndeclare(strict_types=1);\n\nnamespace WpReactUi\\Contracts\\Generated;\n\nfinal class Routes {\n\tpublic const REST_NAMESPACE = ${phpScalar(
      context.routesManifest.namespace
    )};\n\n\tpublic const DEFINITIONS = ${phpScalar(context.routeContracts, 1)};\n\n\tpublic static function route_paths(): array {\n\t\treturn array_keys( self::DEFINITIONS );\n\t}\n}\n`
  );

  files.set(
    "app/Contracts/Generated/Dtos.php",
    `<?php\n/**\n * AUTO-GENERATED from contracts/source. Do not edit.\n */\n\ndeclare(strict_types=1);\n\nnamespace WpReactUi\\Contracts\\Generated;\n\nfinal class Dtos {\n\tpublic const SCHEMAS = ${phpScalar(
      Object.fromEntries(
        dtoSchemas.map((schema) => [
          schema.$id,
          {
            title: schema.title,
            property_keys: schemaPropertyKeys(schema)
          }
        ])
      ),
      1
    )};\n}\n`
  );

  files.set(
    "app/Contracts/Generated/BootPayload.php",
    `<?php\n/**\n * AUTO-GENERATED from contracts/source. Do not edit.\n */\n\ndeclare(strict_types=1);\n\nnamespace WpReactUi\\Contracts\\Generated;\n\nfinal class BootPayload {\n\tpublic const TOP_LEVEL_KEYS = ${phpScalar(schemaPropertyKeys(bootSchema), 1)};\n\tpublic const BRANDING_KEYS = ${phpScalar(
      schemaPropertyKeys(bootSchema.properties.branding),
      1
    )};\n\tpublic const BRANDING_LOGO_KEYS = ${phpScalar(
      schemaPropertyKeys(bootSchema.properties.branding.properties.logos),
      1
    )};\n\tpublic const NAVIGATION_KEYS = ${phpScalar(
      schemaPropertyKeys(bootSchema.properties.navigation),
      1
    )};\n\tpublic const USER_KEYS = ${phpScalar(schemaPropertyKeys(bootSchema.properties.user), 1)};\n\tpublic const SHELL_ROUTE_KEYS = ${phpScalar(
      schemaPropertyKeys(bootSchema.properties.shellRoutes.items),
      1
    )};\n}\n`
  );

  files.set(
    "app/Contracts/Generated/EarlyBootConfig.php",
    `<?php\n/**\n * AUTO-GENERATED from contracts/source. Do not edit.\n */\n\ndeclare(strict_types=1);\n\nnamespace WpReactUi\\Contracts\\Generated;\n\nfinal class EarlyBootConfig {\n\tpublic const DEFAULTS = ${phpScalar(
      collectDefaults(earlyBootSchema, context.registry),
      1
    )};\n}\n`
  );

  return files;
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function generateOutputs() {
  return emitFiles(buildContext());
}

export function writeOutputs(outputs) {
  for (const [relativePath, contents] of outputs.entries()) {
    const absolutePath = path.join(projectRoot, relativePath);
    ensureDir(absolutePath);
    fs.writeFileSync(absolutePath, contents);
  }
}

export function verifyOutputs(outputs) {
  const mismatches = [];
  for (const [relativePath, contents] of outputs.entries()) {
    const absolutePath = path.join(projectRoot, relativePath);
    if (!fs.existsSync(absolutePath)) {
      mismatches.push(relativePath);
      continue;
    }
    const current = fs.readFileSync(absolutePath, "utf8");
    if (current !== contents) {
      mismatches.push(relativePath);
    }
  }
  return mismatches;
}
