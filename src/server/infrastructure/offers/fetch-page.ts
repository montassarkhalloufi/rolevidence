import { errorMessages } from "../../application/locales/errors-fr.ts";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import type { LookupFunction } from "node:net";
import {
  publicUrl,
  publicAddresses,
  URL_TIMEOUT_MS,
  MAX_PAGE_BYTES,
  MAX_REDIRECTS,
} from "./public-url.ts";
import { AppError } from "../../application/errors.ts";

export type PageResponse = {
  status: number;
  location: string | undefined;
  html: string;
};

export type PageTransport = (
  url: URL,
  signal: AbortSignal,
) => Promise<PageResponse>;

export const fetchPinnedPage: PageTransport = async (url, signal) => {
  const addresses = await publicAddresses(url);

  const address = addresses[0];

  if (!address) {
    throw new AppError("IMPORT_FAILED", errorMessages.missingAddress);
  }

  const lookup: LookupFunction = (_host, options, callback) => {
    if (options.all) {
      callback(null, addresses);
    } else {
      callback(null, address.address, address.family);
    }
  };

  return new Promise((resolve, reject) => {
    const transport = url.protocol === "https:" ? httpsRequest : httpRequest;

    const req = transport(
      url,
      {
        lookup,
        signal,
        agent: false,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "Accept-Encoding": "identity",
          "User-Agent": "Rolevidence/0.2 public-job-import",
        },
      },
      (res) => {
        const status = res.statusCode ?? 502;

        if (status >= 300 && status < 400) {
          res.destroy();
          resolve({ status, location: res.headers.location, html: "" });

          return;
        }

        if (
          !/^(text\/html|application\/xhtml\+xml)/i.test(
            res.headers["content-type"] ?? "",
          ) ||
          (res.headers["content-encoding"] &&
            res.headers["content-encoding"] !== "identity")
        ) {
          res.destroy();
          reject(new AppError("IMPORT_FAILED", errorMessages.inaccessibleHtml));

          return;
        }

        const chunks: Buffer[] = [];

        let bytes = 0;

        res.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > MAX_PAGE_BYTES) {
            res.destroy(
              new AppError("FILE_TOO_LARGE", errorMessages.oversizedPage),
            );

            return;
          }

          chunks.push(chunk);
        });
        res.on("error", reject);
        res.on("end", () =>
          resolve({
            status,
            location: undefined,
            html: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      },
    );

    req.on("error", reject);
    req.end();
  });
};

export async function fetchPublicPage(
  input: string,
  transport: PageTransport = fetchPinnedPage,
) {
  const signal = AbortSignal.timeout(URL_TIMEOUT_MS);

  let url = publicUrl(input);

  try {
    for (let count = 0; count <= MAX_REDIRECTS; count++) {
      const response = await Promise.race([
        transport(url, signal),
        new Promise<never>((_resolve, reject) =>
          signal.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          }),
        ),
      ]);

      if (
        response.status >= 300 &&
        response.status < 400 &&
        response.location
      ) {
        url = publicUrl(new URL(response.location, url).href);
        continue;
      }

      if (response.status !== 200) {
        throw new AppError("IMPORT_FAILED", errorMessages.inaccessiblePage);
      }

      return { url: url.href, html: response.html };
    }

    throw new AppError("IMPORT_FAILED", errorMessages.tooManyRedirects);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError("IMPORT_FAILED", errorMessages.pageFetchFailed);
  }
}
