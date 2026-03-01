import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import serverless from "serverless-http";
import path from "path";

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Auth Middleware
  const isAdmin = (req: any, res: any, next: any) => {
    const token = req.headers.authorization || "";
    if (token.replace(/"/g, '') === "admin-token-123") {
      next();
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  };

  // API Routes
  app.get("/api/categories", async (req, res) => {
    const { data, error } = await supabase.from("categories").select("*").order("id");
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.get("/api/nominees/:categoryId", async (req, res) => {
    const { data, error } = await supabase
      .from("nominees")
      .select("*")
      .eq("category_id", req.params.categoryId)
      .order("id");
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/vote", async (req, res) => {
    const { userEmail, categoryId, nomineeId } = req.body;

    // Check if category is locked
    const { data: category } = await supabase
      .from("categories")
      .select("is_locked")
      .eq("id", categoryId)
      .single();

    if (category?.is_locked) {
      return res.status(403).json({ error: "Voting is closed for this category" });
    }

    // Cast vote
    const { error: voteError } = await supabase
      .from("user_votes")
      .insert([{ user_email: userEmail, category_id: categoryId, nominee_id: nomineeId }]);

    if (voteError) {
      if (voteError.code === "23505") {
        return res.status(400).json({ error: "You have already voted in this category" });
      }
      return res.status(500).json({ error: voteError.message });
    }

    // Increment nominee vote count (using RPC or direct update)
    const { data: nominee } = await supabase.from("nominees").select("votes").eq("id", nomineeId).single();
    await supabase.from("nominees").update({ votes: (nominee?.votes || 0) + 1 }).eq("id", nomineeId);

    res.json({ success: true });
  });

  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;
    if (password === (process.env.ADMIN_PASSWORD || "admin123")) {
      res.json({ success: true, token: "admin-token-123" });
    } else {
      res.status(401).json({ error: "Invalid password" });
    }
  });

  app.get("/api/results", isAdmin, async (req, res) => {
    const { data, error } = await supabase
      .from("nominees")
      .select(`
        votes,
        name,
        category_id,
        categories (name)
      `);
    
    if (error) return res.status(500).json({ error: error.message });

    const formatted = data.map((n: any) => ({
      category_name: n.categories?.name || "Unknown",
      nominee_name: n.name,
      votes: n.votes,
      category_id: n.category_id
    }));

    res.json(formatted);
  });

  app.post("/api/admin/categories", isAdmin, async (req, res) => {
    const { name } = req.body;
    const { data, error } = await supabase.from("categories").insert([{ name, is_locked: 1 }]).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
  });

  app.post("/api/admin/categories/:id/toggle-lock", isAdmin, async (req, res) => {
    const { isLocked } = req.body;
    const { error } = await supabase
      .from("categories")
      .update({ is_locked: isLocked ? 1 : 0 })
      .eq("id", req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.post("/api/admin/categories/:id/delete", isAdmin, async (req, res) => {
    const id = req.params.id;
    await supabase.from("user_votes").delete().eq("category_id", id);
    await supabase.from("nominees").delete().eq("category_id", id);
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.post("/api/admin/nominees", isAdmin, async (req, res) => {
    const { name, description, imageUrl, categoryId } = req.body;
    const { data, error } = await supabase
      .from("nominees")
      .insert([{ name, description, image_url: imageUrl, category_id: categoryId, votes: 0 }])
      .select();
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
  });

  app.post("/api/admin/nominees/:id/delete", isAdmin, async (req, res) => {
    const id = req.params.id;
    await supabase.from("user_votes").delete().eq("nominee_id", id);
    const { error } = await supabase.from("nominees").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("index.html", { root: "dist" });
    });
  }

  // Export for Netlify
  const handler = serverless(app);
  (app as any).handler = handler;

  if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
  
  return app;
}

const serverApp = startServer();
export const handler = async (event: any, context: any) => {
  const app = await serverApp;
  return (app as any).handler(event, context);
};
