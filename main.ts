import { listenAndServe } from "https://deno.land/std@0.111.0/http/server.ts";
import { Regex } from "https://deno.land/x/regexbuilder/mod.ts";
import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";

import { createError } from "https://deno.land/x/http_errors/mod.ts";

const uri = "https://news.ycombinator.com/newest";

async function handleRequest(_request): Promise<Response> {
  // We pass the url as the first argument to fetch and an object with
  // additional info like headers, method, and body for POST requests as
  // the second argument. By default fetch makes a GET request,
  // so we can skip specifying method for GET requests.
  const response = await fetch(uri, {
    headers: {
      // Servers use this header to decide on response body format.
      // "application/json" implies that we accept the data in JSON format.
      accept: "text/html,application/json",
    },
  });

  // The .ok property of response indicates that the request is
  // successful (status is in range of 200-299).
  if (response.ok) {
    // response.json() method reads the body and parses it as JSON.
    // It then returns the data in JavaScript object.
    // const { name, login, avatar_url: avatar } = await response.json();
    let ids;
    const htmlText = await response.text();
    try {
      ids = _getParsedIds(htmlText);
    } catch (error) {
    }
    return new Response(
      JSON.stringify(ids),
      {
        headers: {
          "content-type": "application/json; charset=UTF-8",
        },
      },
    );
  }
  // fetch() doesn't throw for bad status codes. You need to handle them
  // by checking if the response.ok is true or false.
  // In this example we're just returning a generic error for simplicity but
  // you might want to handle different cases based on response status code.
  return new Response(
    JSON.stringify({ message: "couldn't process your request" }),
    {
      status: 500,
      headers: {
        "content-type": "application/json; charset=UTF-8",
      },
    },
  );
}

console.log("Listening on http://localhost:8080");
await listenAndServe(":8080", handleRequest);

function _getParsedIds(htmlText: string): number[] {
  let regex = Regex.new()
    .add(/id=(\d+)/)
    .build();

  const parser = new DOMParser();
  const htmlElement: HTMLDocument | null = parser.parseFromString(
    htmlText,
    "text/html",
  );

  const links: string[] = [...htmlElement.querySelectorAll("[href*=item]")].map(
    (
      element: Element,
    ) => (element as HTMLAnchorElement).getAttribute("href"),
  );

  const ids = links.map((link) => {
    let match = regex.exec(link);
    if (match === null || match.length < 2) {
      throw createError(500, "Id preparation has failed.");
    }
    return match[1];
  });

  const uniqueIds = ids.filter(onlyUnique);

  return uniqueIds;
}

function onlyUnique(value: number, index: number, self: number[]): number {
  return self.indexOf(value) === index;
}
