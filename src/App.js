import React, { useEffect, useState } from "react";
import { Table, Select, Layout, Typography, Card, Input } from "antd";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

const { Option } = Select;
const { Content } = Layout;
const { Title } = Typography;
const { Search } = Input;

const firebaseConfig = {
  apiKey: "AIzaSyD-_mKHP7mV8OzVjau1edZ8j43vVa7zrQ0",
  authDomain: "peserta-cpns-disdik-4bb1d.firebaseapp.com",
  projectId: "peserta-cpns-disdik-4bb1d",
  storageBucket: "peserta-cpns-disdik-4bb1d.firebasestorage.app",
  messagingSenderId: "445511902833",
  appId: "1:445511902833:web:e369df9eb1dab482731dd0",
  measurementId: "G-FJYX1MPGLF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const jabatanOptions = [
  "SEMUA",
  "PENATA KELOLA SISTEM DAN TEKNOLOGI INFORMASI",
  "PENGEMBANG TEKNOLOGI PEMBELAJARAN AHLI PERTAMA",
  "PRANATA LABORATORIUM PENDIDIKAN TERAMPIL",
  "PENATA BANGUNAN GEDUNG DAN PERMUKIMAN",
  "PENATA LAKSANA BARANG TERAMPIL",
  "DOKUMENTALIS HUKUM"
];

const joinStatusOptions = [
  { label: "SEMUA", value: undefined },
  { label: "Sudah Terverifikasi", value: true },
  { label: "Belum Terverifikasi", value: false }
];

const hideScrollbarStyle = {
  scrollbarWidth: "none", // Firefox
  msOverflowStyle: "none", // IE 10+
  overflowX: "auto",
};

const hideScrollbarCss = `
  ::-webkit-scrollbar {
    display: none;
  }
`;

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [jabatan, setJabatan] = useState("SEMUA");
  const [joinStatus, setJoinStatus] = useState("undefined");
  const [searchNama, setSearchNama] = useState("");
  const [stats, setStats] = useState({ total: 0, sudah: 0, belum: 0 });

  useEffect(() => {
    fetchData();
  }, [jabatan, joinStatus, searchNama]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let baseQuery = collection(db, "peserta-cpns");
      let filters = [];
      if (jabatan !== "SEMUA") filters.push(where("jabatan", "==", jabatan));
      if (joinStatus !== undefined && joinStatus !== "undefined") filters.push(where("sudahJoin", "==", joinStatus));
      const filteredQuery = filters.length ? query(baseQuery, ...filters) : baseQuery;

      const querySnapshot = await getDocs(filteredQuery);
      let items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (searchNama) {
        const keyword = searchNama.toLowerCase();
        items = items.filter(item => item.nama?.toLowerCase().includes(keyword));
      }

      setData(items);
      const total = items.length;
      const sudah = items.filter(d => d.sudahJoin === true).length;
      const belum = items.filter(d => d.sudahJoin === false).length;
      setStats({ total, sudah, belum });
    } catch (err) {
      console.error("Error fetching data: ", err);
    }
    setLoading(false);
  };

  const columns = [
    { title: "Nama", dataIndex: "nama", key: "nama" },
    { title: "No Peserta", dataIndex: "id", key: "id" },
    { title: "Jabatan", dataIndex: "jabatan", key: "jabatan" },
    {
      title: "Verify Status",
      dataIndex: "sudahJoin",
      key: "sudahJoin",
      render: val => (val ? "Sudah Terverifikasi" : "Belum Terverifikasi")
    }
  ];

  const StatCard = ({ title, value, color, textColor }) => (
    <Card
      style={{
        flex: 1,
        minWidth: 130,
        borderRadius: 10,
        boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
        background: `linear-gradient(135deg, ${color}, #ffffff)`,
        color: textColor || "#000",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start"
      }}
      bodyStyle={{ padding: 0 }}
    >
      <div style={{ fontWeight: "bold", fontSize: 18, padding: 12 }}>{title}</div>
      <div style={{ fontSize: 13, fontWeight: 400, padding: "0 12px 12px" }}>{value}</div>
    </Card>
  );

  const percentageBelum = stats.total > 0 ? ((stats.belum / stats.total) * 100).toFixed(2) + "%" : "0%";

  return (
    <Layout style={{ minHeight: "100vh", padding: 20, backgroundColor: "#f9fafc" }}>
      <style>{hideScrollbarCss}</style>

      {/* Header dengan dekorasi */}
      <div
        style={{
          padding: 30,
          borderRadius: 16,
          background: "linear-gradient(135deg, #4a90e2, #50e3c2)",
          boxShadow: "0 6px 20px rgba(74, 144, 226, 0.4)",
          color: "white",
          textAlign: "center",
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          position: "relative",
          marginBottom: 20,
          userSelect: "none",
        }}
      >
        <Title
          level={2}
          style={{
            margin: 0,
            fontWeight: "700",
            letterSpacing: "1.2px",
            textShadow: "0 2px 6px rgba(0,0,0,0.3)",
            color: "white",
          }}
        >
          Daftar Peserta CPNS Disdik 2024
        </Title>

        {/* Garis bawah dekoratif */}
        <div
          style={{
            width: 80,
            height: 4,
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            borderRadius: 2,
            margin: "12px auto 0",
            boxShadow: "0 2px 6px rgba(255, 255, 255, 0.5)",
          }}
        />
      </div>

      {/* Filter Section */}
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "nowrap",
          ...hideScrollbarStyle,
          marginTop: 24,
          paddingBottom: 10,
          width: "100%",
          boxSizing: "border-box",
        }}
      >

        {/* Filter Nama Peserta */}
        <div style={{ minWidth: 220, flexShrink: 0, display: "flex", flexDirection: "column" }}>
          <label style={{ fontWeight: "bold", fontSize: 16, marginBottom: 4 }}>Nama Peserta</label>
          <Search
            placeholder="Cari nama peserta"
            allowClear
            onSearch={value => setSearchNama(value)}
          />
        </div>
        
        {/* Filter Jabatan */}
        <div style={{ minWidth: 250, flexShrink: 0, display: "flex", flexDirection: "column" }}>
          <label style={{ fontWeight: "bold", fontSize: 16, marginBottom: 4 }}>Jabatan</label>
          <Select
            placeholder="Pilih Jabatan"
            onChange={value => setJabatan(value)}
            value={jabatan}
            required
          >
            {jabatanOptions.map(j => (
              <Option key={j} value={j}>{j}</Option>
            ))}
          </Select>
        </div>

        {/* Filter Verify Status */}
        <div style={{ minWidth: 200, flexShrink: 0, display: "flex", flexDirection: "column" }}>
          <label style={{ fontWeight: "bold", fontSize: 16, marginBottom: 4 }}>Verify Status</label>
          <Select
            placeholder="Pilih Verify Status"
            onChange={value => setJoinStatus(value)}
            value={joinStatus}
            allowClear
          >
            {joinStatusOptions.map(s => (
              <Option key={String(s.value)} value={s.value}>{s.label}</Option>
            ))}
          </Select>
        </div>
      </div>

      {/* Stat Cards */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 24,
          paddingBottom: 10,
          width: "100%",
          boxSizing: "border-box",
          ...hideScrollbarStyle,
        }}
      >
        <StatCard title="Total Peserta" value={stats.total} color="#cce5ff" />
        <StatCard title="Sudah Terverifikasi" value={stats.sudah} color="#d4edda" />
        <StatCard title="Belum Terverifikasi" value={stats.belum} color="#f8d7da" />
        <StatCard title="% Belum Terverifikasi" value={percentageBelum} color="#fff3cd" />
      </div>

      {/* Table */}
      <Content style={{ marginTop: 24 }}>
        <Table
          columns={columns}
          dataSource={data}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 'max-content' }}
          style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
          bordered
        />
      </Content>
    </Layout>
  );
}
