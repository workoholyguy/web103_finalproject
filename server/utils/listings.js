import crypto from "crypto";

export const cleanText = (value = "") =>
  value
    .toLowerCase()
    .replace(/\b(inc|llc|corp|co|ltd|inc\.|llc\.|corp\.)\b/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const listingKey = (company, title, location) =>
  crypto
    .createHash("sha256")
    .update(`${cleanText(company)}|${cleanText(title)}|${cleanText(location)}`)
    .digest("hex");

export const dedupeListings = (items = []) => {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = listingKey(item.company, item.title, item.location);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
};
