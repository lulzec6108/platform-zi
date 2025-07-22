// code.gs (FINAL)

const ss = SpreadsheetApp.getActiveSpreadsheet();

// --- Fungsi Validasi ---
function isValidRequest(e) {
  const SCRIPT_API_KEY = PropertiesService.getScriptProperties().getProperty('API_KEY');
  if (!SCRIPT_API_KEY) return false;

  if (!e || !e.parameter) {
    return false;
  }

  const receivedKey = e.parameter.apiKey;
  return receivedKey === SCRIPT_API_KEY;
}

// --- Fungsi Utility ---
function sendJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// --- Handlers Utama ---
function doGet(e) {
  if (!isValidRequest(e)) {
    return sendJSON({ success: false, message: 'Akses Ditolak' });
  }

  const action = e.parameter.action;
  const payload = e.parameter;

  switch (action) {
    case 'getDashboardTugasStatus':
      return handleGetDashboardTugasStatus(payload);
    case 'getMappingTugasForUser':
      return handleGetMappingTugasForUser(payload);
    case 'getBuktiDukung':
      return handleGetBuktiDukung(payload);
    case 'getLinkPendukung':
      return handleGetLinkPendukung();
    default:
      return sendJSON({ success: false, message: 'Aksi GET tidak valid.' });
  }
}

function doPost(e) {
  if (!isValidRequest(e)) {
    return sendJSON({ success: false, message: 'Akses Ditolak' });
  }

  let payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return sendJSON({ success: false, message: 'Gagal mem-parsing data request.' });
  }
  
  const action = payload.action;

  let response;
  switch (action) {
    case 'login':
      response = handleLogin(payload.payload);
      break;
    case 'getDashboardData':
      response = getDashboardData();
      break;
    case 'saveBuktiDukung':
      response = handleSaveBuktiDukung(payload.payload);
      break;
    case 'setStatusPenilaian':
      response = handleSetStatusPenilaian(payload.payload);
      break;
    default:
      response = { success: false, message: 'Aksi POST tidak valid.' };
  }

  return sendJSON(response);
}

// --- FUNGSI-FUNGSI LOGIKA BISNIS ANDA ---
function handleGetDashboardTugasStatus(payload) {
  var user = getUserInfo(payload.username);
  if (!user || !user.username) return sendJSON({ success: false, message: 'User tidak ditemukan' });
  var tugasSheet = ss.getSheetByName("MappingTugas");
  var tugasData = tugasSheet.getDataRange().getValues();
  var buktiSheet = ss.getSheetByName("BuktiDukung");
  var buktiData = buktiSheet.getDataRange().getValues();
  var usersSheet = ss.getSheetByName("Users");
  var usersData = usersSheet.getDataRange().getValues();
  var usernameToNama = {};
  for (var i = 1; i < usersData.length; i++) {
    usernameToNama[usersData[i][0]] = usersData[i][2];
  }
  var hasil = [];
  for (var i = 1; i < tugasData.length; i++) {
    var row = tugasData[i];
    var kode = row[6];
    var pilar = row[1];
    var tugasUsername = row[0];
    var namaLengkap = usernameToNama[tugasUsername] || tugasUsername;
    var tampil = false;
    if (user.role && user.role.toLowerCase() === "admin") tampil = true;
    else if (user.role && user.role.toLowerCase() === "ketua pilar" && user.pilar === pilar) tampil = true;
    else if (user.role && user.role.toLowerCase() === "anggota" && user.username === tugasUsername) tampil = true;
    if (!tampil) continue;
    var ada = false;
    var statusKetua = "", catatanKetua = "", statusAdmin = "", catatanAdmin = "";
    for (var j = 1; j < buktiData.length; j++) {
      if (
        buktiData[j][0] == tugasUsername &&
        buktiData[j][1] == kode
      ) {
        ada = (buktiData[j][3] && buktiData[j][3].toString().trim() !== "") || (buktiData[j][2] && buktiData[j][2].toString().trim() !== "");
        statusKetua = buktiData[j][5] || "";
        catatanKetua = buktiData[j][6] || "";
        statusAdmin = buktiData[j][7] || "";
        catatanAdmin = buktiData[j][8] || "";
        break;
      }
    }
    hasil.push({
      kode: kode,
      pilar: pilar,
      nama: row[5],
      tugasUsername: tugasUsername,
      namaLengkap: namaLengkap,
      statusAnggota: ada ? "Sedang dikerjakan" : "Belum mengerjakan",
      statusKetua: statusKetua,
      catatanKetua: catatanKetua,
      statusAdmin: statusAdmin,
      catatanAdmin: catatanAdmin,
      linkReferensiMelawi: row[9] || "",
      linkGDriveBukti: row[10] || ""
    });
  }
  return sendJSON(hasil);
}

function handleGetMappingTugasForUser(payload) {
  var mappingSheet = ss.getSheetByName("MappingTugas");
  var mapping = mappingSheet.getDataRange().getValues();
  var headers = mapping[0];
  var res = [];
  for (var i = 1; i < mapping.length; i++) {
    if (mapping[i][0] == payload.username) {
      var row = {};
      for (var j = 0; j < headers.length; j++) {
        row[headers[j]] = mapping[i][j];
      }
      res.push(row);
    }
  }
  return sendJSON(res);
}

function handleGetBuktiDukung(payload) {
  var sheet = ss.getSheetByName("BuktiDukung");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == payload.username && data[i][1] == payload.kodeHirarki) {
      return sendJSON({ 
        nilai: data[i][2], 
        jenis: data[i][3],
        statusKetua: data[i][5] || "",
        catatanKetua: data[i][6] || "",
        statusAdmin: data[i][7] || "",
        catatanAdmin: data[i][8] || ""
      });
    }
  }
  return sendJSON({ nilai: "", jenis: "", statusKetua: "", catatanKetua: "", statusAdmin: "", catatanAdmin: "" });
}

function handleGetLinkPendukung() {
  var sheet = ss.getSheetByName("LinkPendukung");
  if (!sheet) return sendJSON([]);
  var data = sheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][1]) {
      result.push({
        deskripsi: data[i][0],
        link: data[i][1]
      });
    }
  }
  return sendJSON(result);
}

function handleLogin(payload) {
  var sheet = ss.getSheetByName("Users");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == payload.username && data[i][1] == payload.password) {
      return sendJSON({ success: true, nama: data[i][2], pilar: data[i][3], role: data[i][4], username: payload.username });
    }
  }
  return sendJSON({ success: false, message: "Username atau password salah!" });
}

function handleSaveBuktiDukung(payload) {
  var sheet = ss.getSheetByName("BuktiDukung");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == payload.username && data[i][1] == payload.kodeHirarki) {
      sheet.getRange(i+1, 3).setValue(payload.nilai);
      sheet.getRange(i+1, 4).setValue(payload.jenis);
      sheet.getRange(i+1, 5).setValue(new Date());
      return sendJSON({ success: true, message: "Bukti dukung diperbarui." });
    }
  }
  sheet.appendRow([payload.username, payload.kodeHirarki, payload.nilai, payload.jenis, new Date(), "", "", "", ""]);
  return sendJSON({ success: true, message: "Bukti dukung disimpan." });
}

function handleSetStatusPenilaian(payload) {
  var sheet = ss.getSheetByName("BuktiDukung");
  var data = sheet.getDataRange().getValues();
  var colStatus = payload.role === "admin" ? 7 : 5;
  var colCatatan = payload.role === "admin" ? 8 : 6;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][1] && data[i][0] == payload.username && data[i][1] == payload.kodeHirarki) {
      sheet.getRange(i+1, colStatus+1).setValue(payload.status);
      sheet.getRange(i+1, colCatatan+1).setValue(payload.catatan);
      return sendJSON({ success: true, message: "Status berhasil diperbarui." });
    }
  }
  var row = [payload.username, payload.kodeHirarki, "", "", new Date(), "", "", "", ""];
  row[colStatus] = payload.status;
  row[colCatatan] = payload.catatan;
  sheet.appendRow(row);
  return sendJSON({ success: true, message: "Status berhasil ditambahkan." });
}

function getUserInfo(username) {
  if (!username) return {};
  var sheet = ss.getSheetByName("Users");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == username) {
      return { username: username, nama: data[i][2], pilar: data[i][3], role: data[i][4] };
    }
  }
  return {};
}

function getDashboardData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const userSheet = ss.getSheetByName('user');
    const tugasSheet = ss.getSheetByName('MappingTugas');
    const buktiSheet = ss.getSheetByName('BuktiDukung');

    // 1. Baca semua data dari sheet
    const userData = userSheet.getDataRange().getValues();
    const tugasData = tugasSheet.getDataRange().getValues();
    const buktiData = buktiSheet.getDataRange().getValues();

    // 2. Buat Peta (Map) untuk pencarian cepat
    const userMap = new Map(userData.slice(1).map(row => [row[0], row[2]])); // username -> Nama Lengkap
    const buktiMap = new Map();
    buktiData.slice(1).forEach(row => {
        const key = `${row[0]}_${row[1]}`; // key: 'username_kodehirarki'
        buktiMap.set(key, {
            statusKetua: row[5] || 'Belum direview',
            statusAdmin: row[7] || 'Belum direview'
        });
    });

    // 3. Proses dan gabungkan data
    const tugasHeaders = tugasData[0];
    const dashboardData = tugasData.slice(1).map(row => {
        const picUsername = row[0];
        const kodeHirarki = row[6];
        const buktiKey = `${picUsername}_${kodeHirarki}`;
        const bukti = buktiMap.get(buktiKey);

        const statusPengerjaan = bukti ? 'Sudah dikerjakan' : 'Belum dikerjakan';

        return {
            'Kode': kodeHirarki,
            'Pilar': row[1],
            'Nama Tugas': row[5], // Menggunakan 'Tingkatan 4' sebagai Nama Tugas
            'PIC': userMap.get(picUsername) || picUsername, // Tampilkan nama lengkap jika ada
            'Status Pengerjaan': statusPengerjaan,
            'Status Ketua Pilar': bukti ? bukti.statusKetua : 'N/A',
            'Status Admin': bukti ? bukti.statusAdmin : 'N/A'
        };
    });

    return { success: true, data: dashboardData };

  } catch (e) {
    Logger.log('Error in getDashboardData: ' + e.toString());
    return { success: false, message: 'Gagal mengambil data: ' + e.toString() };
  }
}
