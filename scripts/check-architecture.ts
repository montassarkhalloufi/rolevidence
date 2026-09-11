import { readdir, readFile } from "node:fs/promises";
import { resolve, dirname, relative } from "node:path";
import ts from "typescript";

const root = resolve("src");

const files = (await readdir(root, { recursive: true })).filter((file) =>
  /\.(ts|tsx)$/.test(file),
);

const violations: string[] = [];

function allowed(file: string, target: string) {
  if (file.startsWith("server/domain/")) {
    return target.startsWith("server/domain/");
  }

  if (file.startsWith("server/application/")) {
    return /^server\/(domain|application)\//.test(target);
  }

  if (file.startsWith("server/adapters/")) {
    return (
      !target.startsWith("server/infrastructure/") &&
      !target.startsWith("client/")
    );
  }

  if (file.startsWith("client/")) {
    return !target.startsWith("server/");
  }

  if (file.startsWith("shared/")) {
    return target.startsWith("shared/") || !target.includes("/");
  }

  return true;
}

for (const file of files) {
  const path = resolve(root, file);

  const source = ts.createSourceFile(
    path,
    await readFile(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );

  function visit(node: ts.Node) {
    const specifier = moduleSpecifier(node);

    if (specifier && ts.isStringLiteral(specifier)) {
      const name = specifier.text;

      const target = name.startsWith(".")
        ? relative(root, resolve(dirname(path), name))
        : name;

      if (!allowed(file, target)) {
        violations.push(`${file} -> ${target}`);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
}

if (violations.length) {
  throw new Error(`Forbidden dependencies:\n${violations.join("\n")}`);
}

console.log(`Architecture boundaries verified (${files.length} files).`);

function moduleSpecifier(node: ts.Node) {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
    return node.moduleSpecifier;
  }

  if (
    ts.isCallExpression(node) &&
    node.expression.kind === ts.SyntaxKind.ImportKeyword
  ) {
    return node.arguments[0];
  }

  return undefined;
}
