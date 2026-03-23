export default function Custom404() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        background: "#fffbea",
        color: "#1e3926",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        textAlign: "center",
      }}
    >
      <div>
        <p style={{ margin: 0, fontSize: "0.875rem", letterSpacing: "0.12em" }}>
          404
        </p>
        <h1 style={{ margin: "0.75rem 0 0", fontSize: "2rem" }}>
          Seite nicht gefunden
        </h1>
      </div>
    </main>
  );
}
