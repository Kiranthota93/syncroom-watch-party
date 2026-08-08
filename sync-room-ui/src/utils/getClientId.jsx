// crypto.randomUUID() only exists in secure contexts (HTTPS or localhost) —
// accessing the dev server over plain HTTP via a LAN IP is NOT a secure
// context, so it's undefined there and throws. crypto.getRandomValues() has
// no such restriction, so build a UUID v4 from that instead; Math.random()
// is a last-resort fallback for this non-security-sensitive tracking id.
const generateUUID = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const getClientId = () => {
  let client_id =
    localStorage.getItem(
      "client_id"
    );

  if (!client_id) {
    client_id = generateUUID();

    localStorage.setItem(
      "client_id",
      client_id
    );
  }

  return client_id;
};

export default getClientId;
