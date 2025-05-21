import React, { useEffect, useState } from "react";
import { Table, Select, Layout, Typography, Card, Input, Modal, Form, Button, notification } from "antd";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  where,
  startAfter,
  limit,
  getDocs,
  getCountFromServer,
  doc,
  getDoc,
  setDoc,
  updateDoc
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Dropdown options
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
const gFormOptions = [
  { label: "SEMUA", value: null },
  { label: "Sudah Mengisi", value: true },
  { label: "Belum Mengisi", value: false }
];

export default function App() {
  // Data & loading state
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [jabatan, setJabatan] = useState("SEMUA");
  const [joinStatus, setJoinStatus] = useState(null);
  const [filterGForm, setFilterGForm] = useState(null);
  const [searchNama, setSearchNama] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [cursors, setCursors] = useState({});

  // Stats
  const [stats, setStats] = useState({ total: 0, sudah: 0, belum: 0, sudahIsiGForm: 0 });

  // Modal & edit
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();

  // Build Firestore query with filters
  const buildFilteredQuery = () => {
    const ref = collection(db, "peserta-cpns-v2");
    const filters = [];
    if (jabatan !== "SEMUA") filters.push(where("jabatan", "==", jabatan));
    if (typeof joinStatus === "boolean") filters.push(where("sudahJoin", "==", joinStatus));
    if (typeof filterGForm === "boolean") filters.push(where("gForm", "==", filterGForm));
    if (searchNama) {
      const kw = searchNama.toUpperCase();
      filters.push(where("nama", ">=", kw));
      filters.push(where("nama", "<=", kw + "\uffff"));
    }
    return filters.length ? query(ref, ...filters) : query(ref);
  };

  // Fetch summary stats
  const fetchStats = async () => {
    try {
      const baseQ = buildFilteredQuery();
      const totalSnap = await getCountFromServer(baseQ);
      const sudahSnap = await getCountFromServer(query(baseQ, where("sudahJoin", "==", true)));
      const belumSnap = await getCountFromServer(query(baseQ, where("sudahJoin", "==", false)));
      const isiSnap = await getCountFromServer(query(baseQ, where("gForm", "==", true)));
      setStats({
        total: totalSnap.data().count,
        sudah: sudahSnap.data().count,
        belum: belumSnap.data().count,
        sudahIsiGForm: isiSnap.data().count
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  // Fetch paginated page
  const fetchPage = async (page, size) => {
    setLoading(true);
    try {
      let q = buildFilteredQuery();
      q = query(q, limit(size));
      if (page > 1 && cursors[page]) {
        q = query(buildFilteredQuery(), startAfter(cursors[page]), limit(size));
      }
      const snap = await getDocs(q);
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setData(rows);
      const last = snap.docs[snap.docs.length - 1];
      setCursors(prev => ({ ...prev, [page + 1]: last }));
    } catch (err) {
      console.error("Error fetching page:", err);
    }
    setLoading(false);
  };

  // On filter change
  useEffect(() => {
    setCurrentPage(1);
    setCursors({});
    fetchStats();
  }, [jabatan, joinStatus, filterGForm, searchNama]);

  // On page change
  useEffect(() => {
    fetchPage(currentPage, pageSize);
  }, [currentPage, pageSize, jabatan, joinStatus, filterGForm, searchNama]);

  // Show edit modal
  const showEditModal = record => {
    setEditingRecord(record);
    form.setFieldsValue({ sudahJoin: record.sudahJoin, gForm: record.gForm });
    setIsModalVisible(true);
  };

  // Handle save
  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      let ip = 'unknown';
      try {
        const res = await fetch('https://api.ipify.org?format=json');
        const j = await res.json();
        ip = j.ip || ip;
      } catch {}
      const blockRef = doc(db, 'editIPs', ip);
      if ((await getDoc(blockRef)).exists()) {
        notification.error({ message: 'Gagal', description: 'IP ini sudah pernah edit, tidak dapat lagi edit peserta lain.' });
        return;
      }
      const recRef = doc(db, 'peserta-cpns-v2', editingRecord.id);
      await updateDoc(recRef, { sudahJoin: values.sudahJoin, gForm: values.gForm });
      await setDoc(blockRef, { timestamp: new Date() });
      const logRef = doc(collection(db, 'editLogs'));
      await setDoc(logRef, {
        participantId: editingRecord.id,
        ip,
        changes: { sudahJoin: values.sudahJoin, gForm: values.gForm },
        timestamp: new Date()
      });
      notification.success({ message: 'Berhasil', description: 'Perubahan tersimpan.' });
      fetchStats();
      fetchPage(currentPage, pageSize);
      setIsModalVisible(false);
    } catch (err) {
      console.error('Update failed:', err);
      notification.error({ message: 'Error', description: 'Gagal menyimpan perubahan.' });
    }
  };

  const handleCancel = () => setIsModalVisible(false);

  // Table columns
  const columns = [
    { title: 'Nama', dataIndex: 'nama', key: 'nama' },
    { title: 'No Peserta', dataIndex: 'id', key: 'id' },
    { title: 'Jabatan', dataIndex: 'jabatan', key: 'jabatan' },
    { title: 'Sudah Join Group', dataIndex: 'sudahJoin', key: 'sudahJoin', render: v => (v ? 'Sudah' : 'Belum') },
    { title: 'Status GForm', dataIndex: 'gForm', key: 'gForm', render: v => (v ? 'Sudah Mengisi' : 'Belum Mengisi') },
    { title: 'Action', key: 'aksi', render: (_, r) => <Button type="link" onClick={() => showEditModal(r)}>Edit</Button> }
  ];

  return (
    <Layout style={{ minHeight: '100vh', padding: 20, backgroundColor: '#f9fafc' }}>
      <div style={{ padding: 30, borderRadius: 16, background: 'linear-gradient(135deg, #4a90e2, #50e3c2)', color: 'white', textAlign: 'center', marginBottom: 20 }}>
        <Title level={2} style={{ color: 'white' }}>Daftar Peserta CPNS Disdik 2024</Title>
        <a href="https://forms.gle/qhX6SyAEP8MFjxWs9" target="_blank" rel="noopener noreferrer" style={{ color: 'white', textDecoration: 'underline' }}>Isi GForm resmi, verified by Dinas Pendidikan Pemprov DKI Jakarta</a>
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5}}>
          <label>Nama Depan</label>
          <Search placeholder="Nama Depan" onSearch={setSearchNama} style={{ width: 200 }} allowClear />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label>Jabatan</label>
          <Select value={jabatan} onChange={setJabatan} style={{ width: 250 }}>
            {jabatanOptions.map(j => <Option key={j} value={j}>{j}</Option>)}
          </Select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label>Status Join Group</label>
          <Select value={joinStatus} onChange={setJoinStatus} style={{ width: 200 }}>
            {joinStatusOptions.map(s => <Option key={String(s.value)} value={s.value}>{s.label}</Option>)}
          </Select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label>Status GForm</label>
          <Select value={filterGForm} onChange={setFilterGForm} style={{ width: 200 }}>
            {gFormOptions.map(s => <Option key={String(s.value)} value={s.value}>{s.label}</Option>)}
          </Select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <Card style={{ flex: 1, minWidth: 130, background: '#cce5ff' }}><Typography.Text strong>Total Peserta</Typography.Text><div>{stats.total}</div></Card>
        <Card style={{ flex: 1, minWidth: 130, background: '#d4edda' }}><Typography.Text strong>Sudah Join Group</Typography.Text><div>{stats.sudah}</div></Card>
        <Card style={{ flex: 1, minWidth: 130, background: '#f8d7da' }}><Typography.Text strong>Belum Join Group</Typography.Text><div>{stats.belum}</div></Card>
        <Card style={{ flex: 1, minWidth: 130, background: '#fff3cd' }}><Typography.Text strong>Sudah Isi GForm SPMT</Typography.Text><div>{stats.sudahIsiGForm}</div></Card>
      </div>
      <Content>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{ current: currentPage, pageSize, total: stats.total, onChange: (p, s) => { setCurrentPage(p); setPageSize(s); } }}
          scroll={{ x: 'max-content' }}
          bordered
        />
      </Content>
      <Modal
        title={editingRecord ? `Edit Peserta: ${editingRecord.nama}` : 'Edit Peserta'}
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        okText="Simpan"
        cancelText="Batal"
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Sudah Join Group" name="sudahJoin" rules={[{ required: true, message: 'Pilih status join group!' }]}
            >
            <Select placeholder="Pilih status">
              <Option value={true}>Sudah</Option>
              <Option value={false}>Belum</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Status GForm SPMT" name="gForm" rules={[{ required: true, message: 'Pilih status GForm!' }]}
            >
            <Select placeholder="Pilih status">
              <Option value={true}>Sudah Mengisi</Option>
              <Option value={false}>Belum Mengisi</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
