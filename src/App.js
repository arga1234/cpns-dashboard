import React, { useEffect, useState } from "react";
import { Table, Select, Layout, Typography, Card, Input } from "antd";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  startAfter,
  limit,
  getDocs,
  getCountFromServer
} from "firebase/firestore";

const { Option } = Select;
const { Content } = Layout;
const { Title } = Typography;
const { Search } = Input;

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDq9BhFVqHaylTTJ2rURvYTZ7q5pUdE_Rw",
  authDomain: "peserta-cpns-disdik.firebaseapp.com",
  projectId: "peserta-cpns-disdik",
  storageBucket: "peserta-cpns-disdik.firebasestorage.app",
  messagingSenderId: "1046540445455",
  appId: "1:1046540445455:web:44ea0964addf7fd163807a",
  measurementId: "G-3RSWD9NFZG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Options
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
  { label: "SEMUA", value: null },
  { label: "Sudah Join Group", value: true },
  { label: "Belum Join Group", value: false }
];

export default function App() {
  // Table data & loading
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [jabatan, setJabatan] = useState("SEMUA");
  const [joinStatus, setJoinStatus] = useState(null);
  const [searchNama, setSearchNama] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [cursors, setCursors] = useState({});

  // Stats
  const [stats, setStats] = useState({ total: 0, sudah: 0, belum: 0, sudahIsiGForm: 0 });

  // Fetch stats on filter change
  useEffect(() => {
    fetchStats();
    setCurrentPage(1);
    setCursors({});
  }, [jabatan, joinStatus, searchNama]);

  // Fetch data when page or filters change
  useEffect(() => {
    fetchPage(currentPage, pageSize);
  }, [currentPage, pageSize, jabatan, joinStatus, searchNama]);

  // Build base query with filters including name search
  const buildFilteredQuery = () => {
    const baseRef = collection(db, "peserta-cpns-v2");
    const filters = [];
    if (jabatan !== "SEMUA") filters.push(where("jabatan", "==", jabatan));
    if (typeof joinStatus === "boolean") filters.push(where("sudahJoin", "==", joinStatus));
    if (searchNama) {
      const kw = searchNama.toUpperCase();
      filters.push(where("nama", ">=", kw));
      filters.push(where("nama", "<=", kw + "\uf8ff"));
    }
    let q = filters.length ? query(baseRef, ...filters) : query(baseRef);
    return q;
  };

  // Fetch count stats from Firestore
  const fetchStats = async () => {
    try {
      const baseQuery = buildFilteredQuery();
      const totalSnap = await getCountFromServer(baseQuery);
      const sudahSnap = await getCountFromServer(query(baseQuery, where("sudahJoin", "==", true)));
      const belumSnap = await getCountFromServer(query(baseQuery, where("sudahJoin", "==", false)));
      const sudahIsiGformSnap = await getCountFromServer(query(baseQuery, where("gForm", "==", true)));
      setStats({
        total: totalSnap.data().count,
        sudah: sudahSnap.data().count,
        belum: belumSnap.data().count,
        sudahIsiGForm: sudahIsiGformSnap.data().count,
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  // Fetch paginated data
  const fetchPage = async (page, size) => {
    setLoading(true);
    try {
      const filteredQuery = buildFilteredQuery();
      let pagedQuery = query(filteredQuery, limit(size));
      if (page > 1 && cursors[page]) {
        pagedQuery = query(filteredQuery, startAfter(cursors[page]), limit(size));
      }
      const snap = await getDocs(pagedQuery);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("Fetched data:", data);
      setData(data);
      const last = snap.docs[snap.docs.length - 1];
      setCursors(prev => ({ ...prev, [page + 1]: last }));
    } catch (err) {
      console.error("Error fetching page:", err);
    }
    setLoading(false);
  };

  // Table columns
  const columns = [
    { title: "Nama", dataIndex: "nama", key: "nama" },
    { title: "No Peserta", dataIndex: "id", key: "id" },
    { title: "Jabatan", dataIndex: "jabatan", key: "jabatan" },
    { title: "Sudah Join Group", dataIndex: "sudahJoin", key: "sudahJoin", render: val => (val ? "Sudah" : "Belum") },
    { title: "GForm SPMT", dataIndex: "gForm", key: "gForm", render: val => (val ? "Sudah" : "Belum") }
  ];

  const percentageBelum = stats.total ? ((stats.belum / stats.total) * 100).toFixed(2) + "%" : "0%";

  return (
    <Layout style={{ minHeight: "100vh", padding: 20, backgroundColor: "#f9fafc" }}>
      {/* Header */}
      <div style={{ padding: 30, borderRadius: 16, background: "linear-gradient(135deg, #4a90e2, #50e3c2)", color: "white", textAlign: "center", marginBottom: 20 }}>
        <Title level={2} style={{ color: "white" }}>Daftar Peserta CPNS Disdik 2024</Title>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <Search placeholder="Cari nama peserta" onSearch={setSearchNama} style={{ width: 200 }} allowClear />
        <Select value={jabatan} onChange={setJabatan} style={{ width: 250 }}>
          {jabatanOptions.map(j => <Option key={j} value={j}>{j}</Option>)}
        </Select>
        <Select value={joinStatus} onChange={setJoinStatus} style={{ width: 200 }}>
          {joinStatusOptions.map(s => <Option key={String(s.value)} value={s.value}>{s.label}</Option>)}
        </Select>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <Card style={{ flex: 1, minWidth: 130, background: "#cce5ff" }}><Typography.Text strong>Total Peserta</Typography.Text><div>{stats.total}</div></Card>
        <Card style={{ flex: 1, minWidth: 130, background: "#d4edda" }}><Typography.Text strong>Sudah Join Group</Typography.Text><div>{stats.sudah}</div></Card>
        <Card style={{ flex: 1, minWidth: 130, background: "#f8d7da" }}><Typography.Text strong>Belum Join Group</Typography.Text><div>{stats.belum}</div></Card>
        <Card style={{ flex: 1, minWidth: 130, background: "#fff3cd" }}><Typography.Text strong>Sudah Isi GForm SPMT</Typography.Text><div>{stats.sudahIsiGForm}</div></Card>
      </div>

      {/* Table */}
      <Content>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{ current: currentPage, pageSize, total: stats.total, onChange: (page, size) => { setCurrentPage(page); setPageSize(size); } }}
          scroll={{ x: "max-content" }}
          bordered
        />
      </Content>
    </Layout>
  );
}
