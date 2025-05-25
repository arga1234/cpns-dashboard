import React from "react";

function App() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>🛠️</div>
        <h1 style={styles.title}>Situs Sedang Dalam Pemeliharaan</h1>
        <p style={styles.text}>
          Kami sedang melakukan perbaikan untuk meningkatkan layanan.
        </p>
        <p style={styles.notice}>
          Silakan kembali lagi pada pukul <span style={styles.time}>22.00 WIB</span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(to bottom right, #e0f2fe, #f8fafc)",
    padding: "20px",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  card: {
    backgroundColor: "white",
    padding: "40px",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
    maxWidth: "400px",
    textAlign: "center",
  },
  icon: {
    fontSize: "48px",
    marginBottom: "16px",
  },
  title: {
    fontSize: "22px",
    marginBottom: "12px",
    color: "#1e293b",
  },
  text: {
    fontSize: "16px",
    color: "#475569",
    marginBottom: "8px",
  },
  notice: {
    fontWeight: "bold",
    color: "#1e293b",
  },
  time: {
    color: "#2563eb",
  },
};

export default App;
