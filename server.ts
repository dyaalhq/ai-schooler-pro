import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel, Modality } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Initialize GoogleGenAI client with required User-Agent
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health Check
app.get("/api/health", (_req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY;
  res.json({
    status: "ok",
    hasGeminiKey: hasKey,
    timestamp: Date.now(),
  });
});

// Chat & Multimodal Intelligence Route (Handles text, images, video, thinking, search grounding)
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const {
      prompt,
      history = [],
      modelType = "general", // "general" | "fast" | "complex" | "thinking"
      systemInstruction = "أنت 'المعلم الذكي'، مساعد تعليمي وأكاديمي خبير. تشرح المفاهيم بوضوح وتستخدم معادلات KaTeX/LaTeX ومراجع دقيقة مع تشجيع دائم للطالب.",
      image, // { data: base64, mimeType }
      video, // { data: base64, mimeType }
      enableSearch = false,
      thinkingLevel, // "HIGH" | "LOW"
    } = req.body;

    if (!prompt && !image && !video) {
      return res.status(400).json({ error: "Prompt, image, or video is required" });
    }

    const ai = getGeminiClient();

    // Model selection based on user request & guidelines
    let model = "gemini-3.5-flash";
    if (modelType === "fast") {
      model = "gemini-3.1-flash-lite";
    } else if (modelType === "thinking" || thinkingLevel === "HIGH") {
      model = "gemini-3.1-pro-preview";
    } else if (modelType === "complex" || image || video) {
      model = "gemini-3.1-pro-preview";
    } else {
      model = "gemini-3.5-flash";
    }

    // Build contents array
    const parts: any[] = [];

    // Add image if provided
    if (image && image.data) {
      parts.push({
        inlineData: {
          mimeType: image.mimeType || "image/jpeg",
          data: image.data.replace(/^data:[^;]+;base64,/, ""),
        },
      });
    }

    // Add video if provided
    if (video && video.data) {
      parts.push({
        inlineData: {
          mimeType: video.mimeType || "video/mp4",
          data: video.data.replace(/^data:[^;]+;base64,/, ""),
        },
      });
    }

    if (prompt) {
      parts.push({ text: prompt });
    }

    // Format contents with conversation history if present
    let contentsPayload: any;
    if (Array.isArray(history) && history.length > 0) {
      contentsPayload = [];
      for (const h of history) {
        if (!h.text) continue;
        contentsPayload.push({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.text }],
        });
      }
      contentsPayload.push({
        role: "user",
        parts,
      });
    } else {
      contentsPayload = { parts };
    }

    // Config options
    const config: any = {
      systemInstruction,
    };

    // Google Search Grounding if enabled
    if (enableSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    // High Thinking Mode configuration
    if (modelType === "thinking" || thinkingLevel === "HIGH") {
      config.thinkingConfig = {
        thinkingLevel: ThinkingLevel.HIGH,
      };
      // Note: Do not set maxOutputTokens when thinkingLevel is HIGH
    } else if (thinkingLevel === "LOW") {
      config.thinkingConfig = {
        thinkingLevel: ThinkingLevel.LOW,
      };
    }

    const response = await ai.models.generateContent({
      model,
      contents: contentsPayload,
      config,
    });

    const text = response.text || "";
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata || null;

    res.json({
      text,
      modelUsed: model,
      grounding: groundingMetadata,
    });
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    res.status(500).json({
      error: error?.message || "Failed to generate content with Gemini",
    });
  }
});

// Audio Transcription Route (gemini-3.5-transcribe)
app.post("/api/gemini/transcribe", async (req, res) => {
  try {
    const { audioData, mimeType = "audio/mp3", prompt = "يرجى تفريغ هذا التسجيل الصوتي بدقة تامة باللغة العربية مع مراعاة علامات الترقيم والمصطلحات العلمية." } = req.body;

    if (!audioData) {
      return res.status(400).json({ error: "audioData base64 is required" });
    }

    const ai = getGeminiClient();
    const cleanBase64 = audioData.replace(/^data:[^;]+;base64,/, "");

    const audioPart = {
      inlineData: {
        mimeType,
        data: cleanBase64,
      },
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-transcribe",
      contents: { parts: [audioPart, { text: prompt }] },
    });

    res.json({
      text: response.text || "",
      modelUsed: "gemini-3.5-transcribe",
    });
  } catch (error: any) {
    console.error("Transcription Error:", error);
    res.status(500).json({
      error: error?.message || "Failed to transcribe audio",
    });
  }
});

// Science APIs - PubChem compound search
app.get("/api/science/compound/:query", async (req, res) => {
  try {
    const query = req.params.query.trim();
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(query)}/JSON`;
    const response = await fetch(url, { headers: { "Accept": "application/json" } });

    if (!response.ok) {
      return res.status(404).json({ error: "Compound not found in PubChem" });
    }

    const data = await response.json();
    const compound = data?.PC_Compounds?.[0];

    if (!compound) {
      return res.status(404).json({ error: "No compound data available" });
    }

    const cid = compound.id?.id?.cid;
    let molecularFormula = "";
    let molecularWeight = "";
    let iupacName = "";
    let smiles = "";

    if (Array.isArray(compound.props)) {
      for (const prop of compound.props) {
        const label = prop.urn?.label;
        const name = prop.urn?.name;
        if (label === "Molecular Formula") molecularFormula = prop.value?.sval || "";
        if (label === "Molecular Weight") molecularWeight = prop.value?.sval || "";
        if (label === "IUPAC Name" && name === "Preferred") iupacName = prop.value?.sval || "";
        if (label === "SMILES" && name === "Canonical") smiles = prop.value?.sval || "";
      }
    }

    res.json({
      cid,
      name: query,
      molecularFormula,
      molecularWeight,
      iupacName,
      smiles,
      structureImageUrl: cid ? `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG` : null,
      sourceUrl: cid ? `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}` : null,
    });
  } catch (error: any) {
    console.error("PubChem error:", error);
    res.status(500).json({ error: error?.message || "Error querying PubChem" });
  }
});

// Science APIs - Protein search (AlphaFold & PDB structures)
app.get("/api/science/protein/:query", async (req, res) => {
  try {
    const query = req.params.query.trim().toUpperCase();
    const browserHeaders = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json",
    };

    // 1. Try AlphaFold DB API
    const afUrl = `https://alphafold.ebi.ac.uk/api/prediction/${encodeURIComponent(query)}`;
    const afRes = await fetch(afUrl, { headers: browserHeaders });

    if (afRes.ok) {
      const afData = await afRes.json();
      if (Array.isArray(afData) && afData.length > 0) {
        const pred = afData[0];
        return res.json({
          source: "AlphaFold DB",
          uniprotAccession: pred.uniprotAccession || query,
          gene: pred.gene || "",
          organism: pred.organismScientificName || "",
          cifUrl: pred.cifUrl,
          bcifUrl: pred.bcifUrl,
          pdbUrl: pred.pdbUrl,
          plddtUrl: pred.paeDocUrl,
          title: `AlphaFold structure for ${pred.uniprotAccession || query} (${pred.gene || ''})`,
        });
      }
    }

    // 2. Try RCSB PDB
    const pdbUrl = `https://data.rcsb.org/rest/v1/core/entry/${encodeURIComponent(query)}`;
    const pdbRes = await fetch(pdbUrl, { headers: browserHeaders });
    if (pdbRes.ok) {
      const pdbData = await pdbRes.json();
      return res.json({
        source: "RCSB PDB",
        pdbId: query,
        title: pdbData?.struct?.title || `PDB Entry ${query}`,
        cifUrl: `https://files.rcsb.org/download/${query}.cif`,
        pdbUrl: `https://files.rcsb.org/download/${query}.pdb`,
        depositionDate: pdbData?.rcsb_accession_info?.deposit_date || "",
        experimentalMethod: pdbData?.exptl?.[0]?.method || "X-RAY DIFFRACTION",
      });
    }

    res.status(404).json({ error: "Protein structure not found for query" });
  } catch (error: any) {
    console.error("Protein fetch error:", error);
    res.status(500).json({ error: error?.message || "Error fetching protein data" });
  }
});

// Science APIs - Scientific literature query (arXiv & PubMed)
app.get("/api/science/literature", async (req, res) => {
  try {
    const query = (req.query.q as string)?.trim() || "";
    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }

    // Query arXiv
    const arxivUrl = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=5`;
    const arxivRes = await fetch(arxivUrl);
    const xmlText = await arxivRes.text();

    const papers: Array<{ title: string; summary: string; link: string; authors: string[]; published: string }> = [];
    const entries = xmlText.split("<entry>").slice(1);

    for (const entry of entries) {
      const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
      const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
      const idMatch = entry.match(/<id>([\s\S]*?)<\/id>/);
      const pubMatch = entry.match(/<published>([\s\S]*?)<\/published>/);

      if (titleMatch && idMatch) {
        papers.push({
          title: titleMatch[1].replace(/\n+/g, " ").trim(),
          summary: summaryMatch ? summaryMatch[1].replace(/\n+/g, " ").trim().slice(0, 300) + "..." : "",
          link: idMatch[1].trim(),
          authors: [],
          published: pubMatch ? pubMatch[1].slice(0, 10) : "",
        });
      }
    }

    res.json({ papers });
  } catch (error: any) {
    console.error("Literature search error:", error);
    res.status(500).json({ error: error?.message || "Failed to search literature" });
  }
});

// Google Drive integration: Proxy download of Drive files via user's access token
app.post("/api/drive/fetch-file", async (req, res) => {
  try {
    const { fileId } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Authorization bearer token is required" });
    }
    if (!fileId) {
      return res.status(400).json({ error: "fileId is required" });
    }

    // 1. Get file metadata
    const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size`, {
      headers: { Authorization: authHeader },
    });

    if (!metaRes.ok) {
      const errText = await metaRes.text();
      return res.status(metaRes.status).json({ error: `Drive metadata error: ${errText}` });
    }

    const meta = await metaRes.json();
    let downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

    // Handle Google Docs / Sheets exports to PDF
    if (meta.mimeType === "application/vnd.google-apps.document") {
      downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf`;
    } else if (meta.mimeType === "application/vnd.google-apps.spreadsheet") {
      downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf`;
    }

    const fileContentRes = await fetch(downloadUrl, {
      headers: { Authorization: authHeader },
    });

    if (!fileContentRes.ok) {
      const errText = await fileContentRes.text();
      return res.status(fileContentRes.status).json({ error: `Drive download error: ${errText}` });
    }

    const buffer = Buffer.from(await fileContentRes.arrayBuffer());

    res.json({
      id: meta.id,
      name: meta.name,
      mimeType: meta.mimeType.startsWith("application/vnd.google-apps") ? "application/pdf" : meta.mimeType,
      size: buffer.byteLength,
      dataBase64: buffer.toString("base64"),
    });
  } catch (error: any) {
    console.error("Google Drive fetch error:", error);
    res.status(500).json({ error: error?.message || "Failed to download Google Drive file" });
  }
});

// Create HTTP server and attach WebSocket Server for Live API voice conversations
const httpServer = http.createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: "/api/gemini/live" });

wss.on("connection", async (ws: WebSocket) => {
  console.log("[Live API] Client connected to real-time voice channel");
  let liveSession: any = null;

  try {
    const ai = getGeminiClient();

    // Connect to Gemini 3.8 Live API
    liveSession = await ai.live.connect({
      model: "gemini-3.8-live",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Zephyr" },
          },
        },
        systemInstruction: "أنت معلم ذكي ومحاور صوتي أكاديمي لطيف. تتحدث باللغة العربية بأسلوب تعليمي مشجع، تجيب بوضوح وإيجاز على أسئلة الطالب وتشرح المفاهيم العلمية بطريقة مبسطة وممتعة.",
      },
      callbacks: {
        onmessage: (message: any) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audio) {
            ws.send(JSON.stringify({ type: "audio", audio }));
          }
          if (message.serverContent?.interrupted) {
            ws.send(JSON.stringify({ type: "interrupted" }));
          }
        },
        onerror: (err: any) => {
          console.error("[Live API Error]:", err);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "error", error: err?.message || "Live API session error" }));
          }
        },
        onclose: () => {
          console.log("[Live API] Session closed by server");
        },
      },
    });

    ws.on("message", (data: any) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === "audio" && parsed.audio && liveSession) {
          liveSession.sendRealtimeInput({
            audio: {
              data: parsed.audio,
              mimeType: "audio/pcm;rate=16000",
            },
          });
        } else if (parsed.type === "text" && parsed.text && liveSession) {
          liveSession.send({
            parts: [{ text: parsed.text }],
          });
        }
      } catch (e) {
        console.warn("[Live API] Bad packet:", e);
      }
    });

    ws.on("close", () => {
      console.log("[Live API] Client disconnected");
      if (liveSession && typeof liveSession.close === "function") {
        liveSession.close();
      }
    });
  } catch (err: any) {
    console.error("[Live API] Connection error:", err);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "error", error: err?.message || "Failed to initialize Gemini 3.8 Live API" }));
    }
  }
});

// Start Express server with Vite middleware in development
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

start();
