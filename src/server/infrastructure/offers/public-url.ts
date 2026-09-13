import { URL_MAX_CHARACTERS } from "../../../shared/limits.ts";
import { errorMessages } from "../../application/locales/errors-fr.ts";
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
    throw new AppError("INVALID_INPUT", errorMessages.invalidUrl);
  }

  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.port ||
    input.length > URL_MAX_CHARACTERS
  ) {
    throw new AppError("INVALID_INPUT", errorMessages.unsupportedUrl);
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
    throw new AppError("FORBIDDEN", errorMessages.privateAddress);
  }

  return addresses;
}
