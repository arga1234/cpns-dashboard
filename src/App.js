import React, { useEffect, useRef, useState } from "react";
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
  updateDoc,
  documentId
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
const bankAccountOptions = [
  { label: "SEMUA", value: null },
  { label: "Sudah Punya", value: true },
  { label: "Belum Punya", value: false }
];

export default function App() {
  const didMountRef = useRef(false);
  const didStatsRef = useRef(false);


  // Data & loading state
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchId, setSearchId] = useState("");
  const [searchNama, setSearchNama] = useState("");
  const [jabatan, setJabatan] = useState("SEMUA");
  const [joinStatus, setJoinStatus] = useState(null);
  const [filterGForm, setFilterGForm] = useState(null);
  const [filterBank, setFilterBank] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(3);
  const [cursors, setCursors] = useState({});

  // Stats
  const [stats, setStats] = useState({ total: 0, sudahIsiGForm: 0, bankTrue: 0, bankFalse: 0, bankUndefined: 0 });

  // Modal & edit
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();

  // Build Firestore query with filters
  const buildFilteredQuery = () => {
    const ref = collection(db, "peserta-cpns-v2");
    const filters = [];
    if (searchId) filters.push(where(documentId(), "==", searchId));
    if (searchNama) {
      const kw = searchNama.toUpperCase();
      filters.push(where("nama", ">=", kw));
      filters.push(where("nama", "<=", kw + "\uffff"));
    }
    if (jabatan !== "SEMUA") filters.push(where("jabatan", "==", jabatan));
    if (typeof joinStatus === "boolean") filters.push(where("sudahJoin", "==", joinStatus));
    if (typeof filterGForm === "boolean") filters.push(where("gForm", "==", filterGForm));
    if (typeof filterBank === "boolean") filters.push(where("isOwnBankDKIAccount", "==", filterBank));
    return filters.length ? query(ref, ...filters) : query(ref);
  };

  // Fetch summary stats
  const fetchStats = async (isAdmin) => {
    try {
      console.log("Fetching total count only for non-admin");

      const baseQ = buildFilteredQuery();
      if(isAdmin) {
      const totalSnap = await getCountFromServer(baseQ);
      const isiSnap = await getCountFromServer(query(baseQ, where("gForm", "==", true)));
      const trueSnap = await getCountFromServer(query(baseQ, where("isOwnBankDKIAccount", "==", true)));
      const falseSnap = await getCountFromServer(query(baseQ, where("isOwnBankDKIAccount", "==", false)));
      const total = totalSnap.data().count;
      const trueCount = trueSnap.data().count;
      const falseCount = falseSnap.data().count;
      setStats({
        total,
        sudahIsiGForm: isiSnap.data().count,
        bankTrue: trueCount,
        bankFalse: falseCount,
        bankUndefined: total - trueCount - falseCount
      });
      } else {
        const totalSnap = await getCountFromServer(baseQ);
        const total = totalSnap.data().count;
        setStats({total})
      }
      
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  // Fetch paginated page
  const fetchPage = async (page, size) => {
    console.log("Fetching page:", page);
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
      if (last) setCursors(prev => ({ ...prev, [page + 1]: last }));
    } catch (err) {
      console.error("Error fetching page:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    setCurrentPage(1);
    setCursors({});
    fetchStats(new URLSearchParams(window.location.search).get('isAdmin') === 'true');
  }, [searchId, searchNama, jabatan, joinStatus, filterGForm, filterBank]);


  useEffect(() => {
    fetchPage(currentPage, pageSize);   // hanya setelah mount pertama
  }, [currentPage, pageSize, searchId, searchNama, jabatan, joinStatus, filterGForm, filterBank /* ...dst */]);

  // Show edit modal
  const showEditModal = record => {
    setEditingRecord(record);
    form.setFieldsValue({
      sudahJoin: record.sudahJoin,
      gForm: record.gForm,
      isOwnBankDKIAccount: record.isOwnBankDKIAccount
    });
    setIsModalVisible(true);
  };

  // Handle save
  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      let ip = 'unknown';
      try { const res = await fetch('https://api.ipify.org?format=json'); const j = await res.json(); ip = j.ip || ip; } catch {}
      const blockRef = doc(db, 'editIPs', ip);
      if ((await getDoc(blockRef)).exists()) {
        notification.error({ message: 'Gagal', description: 'IP ini sudah pernah edit.' });
        return;
      }
      const recRef = doc(db, 'peserta-cpns-v2', editingRecord.id);
      await updateDoc(recRef, {
        sudahJoin: values.sudahJoin,
        gForm: values.gForm,
        isOwnBankDKIAccount: values.isOwnBankDKIAccount
      });
      await setDoc(blockRef, { timestamp: new Date() });
      const logRef = doc(collection(db, 'editLogs'));
      await setDoc(logRef, { participantId: editingRecord.id, ip, changes: values, timestamp: new Date() });
      notification.success({ message: 'Berhasil', description: 'Perubahan tersimpan.' });
      fetchStats(new URLSearchParams(window.location.search).get('isAdmin') === 'true');
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
    { title: 'No Peserta', dataIndex: 'id', key: 'id' },
    { title: 'Nama', dataIndex: 'nama', key: 'nama' },
    { title: 'Jabatan', dataIndex: 'jabatan', key: 'jabatan' },
    { title: 'Sudah Join Group', dataIndex: 'sudahJoin', key: 'sudahJoin', render: v => (v ? 'Sudah' : 'Belum') },
    { title: 'Status GForm', dataIndex: 'gForm', key: 'gForm', render: v => (v ? 'Sudah Mengisi' : 'Belum Mengisi') },
    { title: 'Sudah Punya Rek. B. DKI', dataIndex: 'isOwnBankDKIAccount', key: 'isOwnBankDKIAccount', render: v => v === true ? 'Sudah Punya' : v === false ? 'Belum Punya' : 'Belum Menjawab' },
    { title: 'Action', key: 'aksi', render: (_, r) => <Button type="link" onClick={() => showEditModal(r)}>Edit</Button> }
  ];

  return (
    <Layout style={{ minHeight: '100vh', padding: 20, backgroundColor: '#f9fafc' }}>
      <div style={{ padding: 30, borderRadius: 16, background: 'linear-gradient(135deg, #4a90e2, #50e3c2)', color: 'white', textAlign: 'center', marginBottom: 20 }}>
        <Title level={2} style={{ color: 'white' }}>Daftar Peserta CPNS Disdik 2024</Title>
        <a href="https://forms.gle/qhX6SyAEP8MFjxWs9" target="_blank" rel="noopener noreferrer" style={{ color: 'white', textDecoration: 'underline' }}>
          Isi GForm resmi, verified by Dinas Pendidikan Pemprov DKI Jakarta
        </a>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexWrap: "nowrap", overflow: "auto", gap: 16, marginBottom: 20 }}>
        <div>
          <label>No Peserta</label><br />
          <Search placeholder="No Peserta (ID Dokumen)" onSearch={setSearchId} style={{ width: 200 }} allowClear />
        </div>
        <div>
          <label>Nama Depan</label><br />
          <Search placeholder="Nama Depan" onSearch={setSearchNama} style={{ width: 200 }} allowClear />
        </div>
        <div>
          <label>Jabatan</label><br />
          <Select value={jabatan} onChange={setJabatan} style={{ width: 250 }}>
            {jabatanOptions.map(j => <Option key={j} value={j}>{j}</Option>)}
          </Select>
        </div>
        <div>
          <label>Sudah Join Group</label><br />
          <Select value={joinStatus} onChange={setJoinStatus} style={{ width: 200 }}>
            {joinStatusOptions.map(s => <Option key={String(s.value)} value={s.value}>{s.label}</Option>)}
          </Select>
        </div>
        <div>
          <label>Status GForm</label><br />
          <Select value={filterGForm} onChange={setFilterGForm} style={{ width: 200 }}>
            {gFormOptions.map(s => <Option key={String(s.value)} value={s.value}>{s.label}</Option>)}
          </Select>
        </div>
        <div>
          <label>Rekening Bank DKI</label><br />
          <Select value={filterBank} onChange={setFilterBank} style={{ width: 200 }}>
            {bankAccountOptions.map(s => <Option key={String(s.value)} value={s.value}>{s.label}</Option>)}
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      {new URLSearchParams(window.location.search).get('isAdmin') === 'true' && (
        <div style={{ display: 'flex', flexWrap: "nowrap", overflow: "auto", gap: 16, marginBottom: 20 }}>
          <Card style={{ flex: 1, minWidth: 130, background: '#cce5ff' }}>
            <Typography.Text strong>Total Peserta</Typography.Text>
            <div>{stats.total}</div>
          </Card>
          <Card style={{ flex: 1, minWidth: 130, background: '#d4edda' }}>
            <Typography.Text strong>Sudah Isi GForm</Typography.Text>
            <div>{stats.sudahIsiGForm}</div>
          </Card>
          <Card style={{ flex: 1, minWidth: 130, background: '#d1f7c4' }}>
            <Typography.Text strong>Sudah Punya Rek. B. DKI</Typography.Text>
            <div>{stats.bankTrue}</div>
          </Card>
          <Card style={{ flex: 1, minWidth: 130, background: '#f9d1d1' }}>
            <Typography.Text strong>Belum Punya Rek. B. DKI</Typography.Text>
            <div>{stats.bankFalse}</div>
          </Card>
          <Card style={{ flex: 1, minWidth: 130, background: '#fff3cd' }}>
            <Typography.Text strong>Belum Konfirmasi Kepemilikan Rek. B. DKI</Typography.Text>
            <div>{stats.bankUndefined}</div>
          </Card>
        </div>
      )}
      <Content>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize,
            total: stats.total,
            showSizeChanger: false,
            onChange: (p) => {
              if ([1, currentPage+1, currentPage-1].includes(p)) setCurrentPage(p);
              else notification.warning({ message: "Navigasi Terbatas", description: "Mohon navigasi halaman secara bertahap." });
            }
          }}
          scroll={{ x: 'max-content' }}
          bordered
        />
      </Content>

      {/* Edit Modal */}
      <Modal
        title={editingRecord ? `Edit Peserta: ${editingRecord.nama}` : 'Edit Peserta'}
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        okText="Simpan"
        cancelText="Batal"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            label="Sudah Join Group"
            name="sudahJoin"
            rules={[{ required: true, message: 'Pilih status join group!' }]}
          >
            <Select placeholder="Pilih status">
              <Option value={true}>Sudah</Option>
              <Option value={false}>Belum</Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="Status GForm SPMT"
            name="gForm"
            rules={[{ required: true, message: 'Pilih status GForm!' }]}
          >
            <Select placeholder="Pilih status">
              <Option value={true}>Sudah Mengisi</Option>
              <Option value={false}>Belum Mengisi</Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="Apakah Sudah Punya Rek. B. DKI?"
            name="isOwnBankDKIAccount"
            rules={[{ required: true, message: 'Pilih status rekening bank DKI!' }]}
          >
            <Select placeholder="Pilih status">
              <Option value={true}>Sudah Punya</Option>
              <Option value={false}>Belum Punya</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}