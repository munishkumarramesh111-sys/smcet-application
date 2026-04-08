export default function handler(req, res) {
  if (req.method === "POST") {
    return res.status(200).json({ message: "POST received" });
  }

  res.status(200).send("Hello from API");
}
