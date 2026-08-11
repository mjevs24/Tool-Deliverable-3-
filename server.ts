import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser middleware
  app.use(express.json());

  // Server-side save reflection endpoint
  app.post("/api/save-reflection", async (req, res) => {
    try {
      const {
        sessionId,
        timestamp,
        q1Scenario,
        q2Theme,
        q3ReflectionNeed,
        promptId,
        promptType,
        appVersion,
        reflectionText,
        email,
        consentToEmail,
        framingSentence,
        q2FramingSentence,
        promptText
      } = req.body;

      if (!sessionId) {
        res.status(400).json({
          status: "error",
          message: "Session ID is required.",
        });
        return;
      }

      // Keep Apps Script URL entirely server-side
      const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbxfMWhUo3GdQ4GpgXPMKNyy5atlh6S_M7RhZb8Hf3XyKInmDo9g4bhI2F20qNSKEzDWhA/exec";

      const isConfigured = !!scriptUrl && scriptUrl.trim().length > 0;

      if (!isConfigured) {
        res.json({
          status: "pending",
          message: "Server storage URL is not configured.",
          isConfigured: false,
        });
        return;
      }

      // Forward complete requested JSON payload to Google Apps Script Web App URL
      const payload = {
        sessionId,
        timestamp: timestamp || new Date().toISOString(),
        q1Scenario: q1Scenario || "",
        q2Theme: q2Theme || "",
        q3ReflectionNeed: q3ReflectionNeed || "",
        promptId: promptId || "",
        promptType: promptType || "Fallback",
        appVersion: appVersion || "1.0",
        reflectionText: reflectionText || "",
        email: email || "",
        consentToEmail: consentToEmail !== undefined ? consentToEmail : false,
        framingSentence: framingSentence || "",
        q2FramingSentence: q2FramingSentence || "",
        promptText: promptText || ""
      };

      try {
        let currentUrl = scriptUrl;
        let response: Response | null = null;
        let attempts = 0;
        const maxRedirects = 5;
        let currentMethod = "POST";
        let currentHeaders: Record<string, string> = {
          "Content-Type": "application/json",
        };
        let currentBody: string | undefined = JSON.stringify(payload);

        while (attempts < maxRedirects) {
          console.log(`[Developer Debug] Fetch attempt ${attempts + 1} to URL: ${currentUrl}`);
          console.log(`[Developer Debug] Method: ${currentMethod}, Headers:`, currentHeaders);

          response = await fetch(currentUrl, {
            method: currentMethod,
            headers: currentHeaders,
            body: currentBody,
            redirect: "manual",
          });

          console.log(`[Developer Debug] Response Status: ${response.status} ${response.statusText}`);
          console.log(`[Developer Debug] Response Content-Type: ${response.headers.get("content-type")}`);
          const location = response.headers.get("location");
          if (location) {
            console.log(`[Developer Debug] Redirect Destination: ${location}`);
          }

          if (
            response.status === 301 ||
            response.status === 302 ||
            response.status === 303 ||
            response.status === 307 ||
            response.status === 308
          ) {
            if (!location) {
              console.log(`[Developer Debug] Redirect status received, but Location header is missing.`);
              break;
            }
            currentUrl = new URL(location, currentUrl).toString();
            attempts++;

            // 301, 302, 303 redirects should switch the request method to GET and drop the body
            if (response.status === 301 || response.status === 302 || response.status === 303) {
              console.log(`[Developer Debug] Redirecting using GET (dropping body)`);
              currentMethod = "GET";
              currentHeaders = {};
              currentBody = undefined;
            } else {
              console.log(`[Developer Debug] Redirecting preserving method and body`);
            }
          } else {
            break;
          }
        }

        if (!response) {
          throw new Error("No response received from target URL");
        }

        const responseText = await response.text();
        const contentType = response.headers.get("content-type") || "";

        console.log(`[Developer Debug] Final Response Status: ${response.status}`);
        console.log(`[Developer Debug] Final Response Content-Type: ${contentType}`);
        console.log(`[Developer Debug] Final Response Body: ${responseText.slice(0, 1000)}`);

        if (!response.ok) {
          throw new Error(`Google Apps Script returned status ${response.status}. Response: ${responseText.slice(0, 200)}`);
        }

        res.json({
          status: "success",
          message: "Reflection saved successfully.",
          isConfigured: true,
          response: responseText,
        });
      } catch (fetchError: any) {
        // Log errors generically without revealing the sensitive URL
        console.error("Failed to forward payload to Apps Script endpoint:", fetchError.message || fetchError);
        res.status(502).json({
          status: "error",
          message: `Connection failed: ${fetchError.message || fetchError}`,
          isConfigured: true,
        });
      }
    } catch (err: any) {
      console.error("Internal Server Error in save-reflection API:", err.message || err);
      res.status(500).json({
        status: "error",
        message: "Internal server error.",
      });
    }
  });

  // Serve static files in production or proxy Vite dev server
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start full-stack server:", err);
});
