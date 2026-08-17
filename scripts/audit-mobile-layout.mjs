import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const cdpPort = process.env.CDP_PORT || "9224";
const siteOrigin = process.env.SITE_ORIGIN || "http://127.0.0.1:4173";
const viewportWidth = Number(process.env.MOBILE_WIDTH || 390);
const viewportHeight = Number(process.env.MOBILE_HEIGHT || 844);
const screenshotDirectory = process.env.MOBILE_SCREENSHOT_DIR
  ? resolve(process.env.MOBILE_SCREENSHOT_DIR)
  : "";
const openMobileMenu = process.env.MOBILE_OPEN_MENU === "1";
const routes = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      "/",
      "/products",
      "/products/search?q=t54w",
      "/products/item/IPY-T53W",
      "/cart",
      "/checkout",
      "/signup",
      "/contact",
      "/services",
    ];

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const createPage = async () => {
  const response = await fetch(`http://127.0.0.1:${cdpPort}/json/new?about:blank`, {
    method: "PUT",
  });
  if (!response.ok) {
    throw new Error(`Unable to create browser page (${response.status}).`);
  }
  return response.json();
};

const connect = async (webSocketDebuggerUrl) => {
  const socket = new WebSocket(webSocketDebuggerUrl);
  const pending = new Map();
  const eventWaiters = new Map();
  let commandId = 0;

  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
      return;
    }

    const waiters = eventWaiters.get(message.method) || [];
    eventWaiters.delete(message.method);
    waiters.forEach((resolve) => resolve(message.params));
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++commandId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });

  const waitForEvent = (method) =>
    new Promise((resolve) => {
      eventWaiters.set(method, [...(eventWaiters.get(method) || []), resolve]);
    });

  return { socket, send, waitForEvent };
};

const inspectPage = async (route) => {
  const page = await createPage();
  const client = await connect(page.webSocketDebuggerUrl);

  try {
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: viewportWidth,
      height: viewportHeight,
      deviceScaleFactor: 1,
      mobile: true,
      screenWidth: viewportWidth,
      screenHeight: viewportHeight,
    });
    await client.send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 5,
    });

    const loaded = client.waitForEvent("Page.loadEventFired");
    await client.send("Page.navigate", { url: new URL(route, siteOrigin).toString() });
    await Promise.race([loaded, delay(10000)]);
    await delay(2500);

    if (openMobileMenu) {
      await client.send("Runtime.evaluate", {
        expression: `document.querySelector('[aria-label="Open navigation menu"]')?.click()`,
      });
      await delay(300);
    }

    const result = await client.send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const viewportWidth = document.documentElement.clientWidth;
        const viewportHeight = window.innerHeight;
        const visibleElements = [...document.querySelectorAll('body *')].filter((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        });
        const overflowElements = visibleElements
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              tag: element.tagName.toLowerCase(),
              text: (element.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 80),
              className: typeof element.className === 'string' ? element.className.slice(0, 120) : '',
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
            };
          })
          .filter((item) => item.left < -1 || item.right > viewportWidth + 1)
          .slice(0, 20);
        const undersizedControls = visibleElements
          .filter((element) => {
            if (!element.matches('button, a, input, select, textarea')) return false;
            const isLabelledChoice =
              element instanceof HTMLInputElement &&
              (element.type === 'checkbox' || element.type === 'radio') &&
              Boolean(element.closest('label'));
            return !isLabelledChoice;
          })
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              tag: element.tagName.toLowerCase(),
              text: (element.textContent || element.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim().slice(0, 60),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            };
          })
          .filter((item) => item.width < 40 || item.height < 40)
          .slice(0, 20);
        const oversizedControls = visibleElements
          .filter((element) => element.matches('button, input, select, textarea'))
          .map((element) => {
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return {
              tag: element.tagName.toLowerCase(),
              text: (element.textContent || element.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 60),
              className: typeof element.className === 'string' ? element.className.slice(0, 160) : '',
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              display: style.display,
              position: style.position,
            };
          })
          .filter((item) => item.height > Math.max(160, viewportHeight * 0.5))
          .slice(0, 20);

        return {
          title: document.title,
          viewportWidth,
          viewportHeight,
          documentWidth: document.documentElement.scrollWidth,
          horizontalOverflow: document.documentElement.scrollWidth > viewportWidth + 1,
          overflowElements,
          undersizedControls,
          oversizedControls,
        };
      })()`,
    });

    let screenshot = null;
    if (screenshotDirectory) {
      mkdirSync(screenshotDirectory, { recursive: true });
      const routeName = route === "/"
        ? "home"
        : route
            .replace(/^\//, "")
            .replace(/[^a-z0-9]+/gi, "-")
            .replace(/^-|-$/g, "")
            .toLowerCase();
      const fileName = `${routeName || "page"}-${viewportWidth}x${viewportHeight}.png`;
      const image = await client.send("Page.captureScreenshot", {
        format: "png",
        fromSurface: true,
        captureBeyondViewport: false,
      });
      const filePath = resolve(screenshotDirectory, fileName);
      writeFileSync(filePath, Buffer.from(image.data, "base64"));
      screenshot = filePath;
    }

    return { route, ...result.result.value, screenshot };
  } finally {
    client.socket.close();
    await fetch(`http://127.0.0.1:${cdpPort}/json/close/${page.id}`);
  }
};

const results = [];
for (const route of routes) {
  try {
    results.push(await inspectPage(route));
  } catch (error) {
    results.push({ route, error: error instanceof Error ? error.message : String(error) });
  }
}

console.log(JSON.stringify({ viewportWidth, viewportHeight, siteOrigin, results }, null, 2));

if (results.some((result) => result.error || result.horizontalOverflow)) {
  process.exitCode = 1;
}
