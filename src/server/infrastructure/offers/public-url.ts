import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";
import { AppError } from "../../application/errors.ts";

export const URL_TIMEOUT_MS = 15_000;

export const MAX_PAGE_BYTES = 1_000_000;

export const MAX_REDIRECTS = 3;

export function publicUrl(input: string): URL {
  let url: URL;

  try {
    url = new URL(input);
  } catch {
    throw new AppError("INVALID_INPUT", "Le lien est invalide.");
  }

  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.port ||
    input.length > 2048
  ) {
    throw new AppError(
      "INVALID_INPUT",
      "Utilisez un lien HTTP(S) public, sans identifiants ni port personnalisé.",
    );
  }

  url.hash = "";

  return url;
}

export function isPublicAddress(address: string) {
  try {
    return ipaddr.process(address).range() === "unicast";
  } catch {
    return false;
  }
}

export async function publicAddresses(url: URL) {
  const host = url.hostname.replace(/^\[|\]$/g, "");

  const addresses = await lookup(host, { all: true, verbatim: true });

  if (
    !addresses.length ||
    addresses.some(({ address }) => !isPublicAddress(address))
  ) {
    throw new AppError(
      "FORBIDDEN",
      "Ce lien ne désigne pas une adresse Internet publique autorisée.",
    );
  }

  return addresses;
}
