import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { sendBulkWhatsApp, validatePhoneNumbers } from '../../services/whatsappService';
import { collectionGroup, getDocs, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../services/firebase';

// Hardcoded template SIDs
const TEMPLATE_NO_MEDIA   = 'HX12e2193907d8fda6066b2387c3821d81';  // {{1}} name, {{2}} message
const TEMPLATE_WITH_MEDIA = 'HX122046fd28126270220d4d536c48cf73'; // {{1}} name, {{2}} message, {{3}} media var
const TEMPLATE_QUICK_REPLY = 'HX700dc966d8e30f63646b30ea183ba535'; // {{1}} name only — users reply YES to opt in

const extractMediaVar = (downloadUrl) => {
    try {
        const match = downloadUrl.match(/promotions%2F(.+)/);
        return match ? match[1] : downloadUrl;
    } catch {
        return downloadUrl;
    }
};

const nameFromEmail = (email) => {
    if (!email) return 'User';
    const prefix = email.split('@')[0].replace(/[._\-0-9]+/g, ' ').trim();
    return prefix
        .split(' ')
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ') || 'User';
};

const BulkWhatsAppSender = () => {
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [result, setResult] = useState(null);
    // Campaign type: 'promotional' | 'quickReply'
    const [campaignType, setCampaignType] = useState('promotional');
    const [message, setMessage] = useState('');
    const [followUpMessage, setFollowUpMessage] = useState('');
    // Media upload state
    const [mediaFile, setMediaFile] = useState(null);       // File object chosen by admin
    const [mediaPreview, setMediaPreview] = useState(null); // local object URL for preview
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [mediaVar, setMediaVar] = useState('');            // {{3}} value after upload
    const fileInputRef = useRef(null);
    const excelInputRef = useRef(null);
    // Recipient mode: 'database' | 'excel'
    const [recipientMode, setRecipientMode] = useState('database');
    // Excel import state
    const [excelFile, setExcelFile] = useState(null);
    const [importedUsers, setImportedUsers] = useState([]);
    const [selectedImportedPhones, setSelectedImportedPhones] = useState(new Set());
    const [excelError, setExcelError] = useState('');
    // Database state
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPhones, setSelectedPhones] = useState(new Set());

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const cgSnap = await getDocs(collectionGroup(db, 'info'));
                const fetched = [];

                cgSnap.forEach((docSnap) => {
                    if (docSnap.id === 'details') {
                        const data = docSnap.data();
                        const phone = data?.whatsappNumber?.trim();
                        const email = data?.email?.trim();
                        if (phone) {
                            const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
                            fetched.push({ phone: formattedPhone, name: nameFromEmail(email), email: email || '' });
                        }
                    }
                });

                setUsers(fetched);
            } catch (err) {
                setResult({ type: 'error', message: `Failed to load users: ${err.message}` });
            } finally {
                setFetchLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone.includes(searchQuery) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const allFilteredSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedPhones.has(u.phone));

    const toggleAll = () => {
        if (allFilteredSelected) {
            setSelectedPhones(prev => {
                const next = new Set(prev);
                filteredUsers.forEach(u => next.delete(u.phone));
                return next;
            });
        } else {
            setSelectedPhones(prev => {
                const next = new Set(prev);
                filteredUsers.forEach(u => next.add(u.phone));
                return next;
            });
        }
    };

    const toggleOne = (phone) => {
        setSelectedPhones(prev => {
            const next = new Set(prev);
            next.has(phone) ? next.delete(phone) : next.add(phone);
            return next;
        });
    };

    const selectedUsers = users.filter(u => selectedPhones.has(u.phone));

    // ── Excel import helpers ──────────────────────────────────────────────────
    const normalisePhone = (raw) => {
        if (!raw) return '';
        const s = String(raw).trim();
        if (s.startsWith('+')) return s;
        const digits = s.replace(/\D/g, '');
        if (digits.length === 10) return `+91${digits}`;
        if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
        if (digits.length > 0) return `+${digits}`;
        return '';
    };

    const handleExcelChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setExcelFile(file);
        setExcelError('');
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const wb = XLSX.read(ev.target.result, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
                if (rows.length < 2) { setExcelError('File is empty or has no data rows.'); return; }
                const headers = rows[0].map(h => String(h).toLowerCase().trim());
                const nameIdx = headers.findIndex(h => h.includes('name'));
                const phoneIdx = headers.findIndex(h =>
                    h.includes('phone') || h.includes('whatsapp') || h.includes('mobile') || h.includes('number')
                );
                if (nameIdx === -1 || phoneIdx === -1) {
                    setExcelError('Could not find "name" and "phone / whatsapp / mobile" columns in the header row.');
                    return;
                }
                const parsed = [];
                const seen = new Set();
                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    const name = String(row[nameIdx] ?? '').trim() || 'User';
                    const phone = normalisePhone(row[phoneIdx]);
                    if (!phone || seen.has(phone)) continue;
                    seen.add(phone);
                    parsed.push({ name, phone });
                }
                if (parsed.length === 0) { setExcelError('No valid phone numbers found in the file.'); return; }
                setImportedUsers(parsed);
                setSelectedImportedPhones(new Set(parsed.map(u => u.phone)));
            } catch (err) {
                setExcelError(`Failed to parse file: ${err.message}`);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const clearExcel = () => {
        setExcelFile(null);
        setImportedUsers([]);
        setSelectedImportedPhones(new Set());
        setExcelError('');
        if (excelInputRef.current) excelInputRef.current.value = '';
    };

    const allImportedSelected = importedUsers.length > 0 && importedUsers.every(u => selectedImportedPhones.has(u.phone));
    const toggleAllImported = () => {
        if (allImportedSelected) setSelectedImportedPhones(new Set());
        else setSelectedImportedPhones(new Set(importedUsers.map(u => u.phone)));
    };
    const toggleOneImported = (phone) => {
        setSelectedImportedPhones(prev => {
            const next = new Set(prev);
            next.has(phone) ? next.delete(phone) : next.add(phone);
            return next;
        });
    };

    // Upload media file to Firebase Storage promotions/ and extract {{3}} var
    const handleMediaChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setMediaFile(file);
        setMediaPreview(URL.createObjectURL(file));
        setMediaVar('');
        setUploadProgress(0);
        setUploadLoading(true);

        try {
            const filename = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            const storageRef = ref(storage, `promotions/${filename}`);
            const task = uploadBytesResumable(storageRef, file);

            await new Promise((resolve, reject) => {
                task.on(
                    'state_changed',
                    (snap) => {
                        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
                        setUploadProgress(pct);
                    },
                    reject,
                    async () => {
                        const url = await getDownloadURL(task.snapshot.ref);
                        const v3 = extractMediaVar(url);
                        setMediaVar(v3);
                        resolve();
                    }
                );
            });
        } catch (err) {
            setResult({ type: 'error', message: `Media upload failed: ${err.message}` });
            setMediaFile(null);
            setMediaPreview(null);
        } finally {
            setUploadLoading(false);
        }
    };

    const clearMedia = () => {
        setMediaFile(null);
        setMediaPreview(null);
        setMediaVar('');
        setUploadProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const sendMessages = async () => {
        setLoading(true);
        setResult(null);
        try {
            const targets = recipientMode === 'excel'
                ? (selectedImportedPhones.size > 0
                    ? importedUsers.filter(u => selectedImportedPhones.has(u.phone))
                    : importedUsers)
                : (selectedUsers.length > 0 ? selectedUsers : users);
            const { valid, invalid } = validatePhoneNumbers(targets);

            if (invalid.length > 0) console.warn('Invalid numbers:', invalid);
            if (valid.length === 0) throw new Error('No valid phone numbers found');

            if (campaignType === 'quickReply') {
                // ── Quick Reply flow ──────────────────────────────────────────
                // 1. Save the follow-up message to Firestore so the webhook can read it
                if (!followUpMessage.trim()) throw new Error('Please enter the follow-up message to send after users reply YES.');
                await setDoc(doc(db, 'admin', 'whatsapp_settings'), {
                    followUpMessage: followUpMessage.trim(),
                    updatedAt: new Date().toISOString()
                }, { merge: true });

                // 2. Send Quick Reply template — only {{1}} = name
                const res = await sendBulkWhatsApp(valid, { contentVariables: {} }, {
                    useTemplate: true,
                    contentSid: TEMPLATE_QUICK_REPLY
                });
                setResult({
                    type: 'success',
                    message: `✅ Quick Reply sent: ${res.success}, ❌ Failed: ${res.failed}, ⚠️ Invalid: ${invalid.length}`,
                    details: res
                });
            } else if (!mediaVar) {
                // No media → without_media template ({{1}} name, {{2}} message)
                const messageText = message || 'Welcome to Urban Pilgrim! 🧘‍♀️';
                const res = await sendBulkWhatsApp(valid, messageText, {
                    useTemplate: true,
                    contentSid: TEMPLATE_NO_MEDIA
                });
                setResult({
                    type: 'success',
                    message: `✅ Sent: ${res.success}, ❌ Failed: ${res.failed}, ⚠️ Invalid: ${invalid.length}`,
                    details: res
                });
            } else {
                // Media uploaded → with_media template ({{1}} name, {{2}} message, {{3}} media var)
                const messageDataObj = {
                    contentVariables: {
                        '2': message || '',
                        '3': mediaVar
                    }
                };
                const res = await sendBulkWhatsApp(valid, messageDataObj, {
                    useTemplate: true,
                    contentSid: TEMPLATE_WITH_MEDIA
                });
                setResult({
                    type: 'success',
                    message: `✅ Sent (with media): ${res.success}, ❌ Failed: ${res.failed}, ⚠️ Invalid: ${invalid.length}`,
                    details: res
                });
            }
        } catch (error) {
            setResult({
                type: 'error',
                message: `Error: ${error.message}`,
                details: { error: error.message, code: error.code }
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Bulk WhatsApp Sender</h2>

            {/* Campaign Type */}
            <div className="mb-5">
                <label className="block mb-2 font-semibold">Campaign Type</label>
                <div className="flex md:flex-row flex-col gap-2">
                    {[
                        { id: 'promotional', label: 'Promotional', desc: 'Send message directly (with or without media)' },
                        { id: 'quickReply',  label: 'Quick Reply', desc: 'Send opt-in ping → reply YES → you send details' },
                    ].map(({ id, label, desc }) => (
                        <button key={id} type="button"
                            onClick={() => setCampaignType(id)}
                            className={`flex-1 px-4 py-3 rounded-xl border text-left transition-colors ${
                                campaignType === id
                                    ? 'bg-[#C5703F] text-white border-[#C5703F]'
                                    : 'bg-white text-gray-600 border-gray-300 hover:border-[#C5703F]'
                            }`}
                        >
                            <span className="font-semibold text-sm block">{label}</span>
                            <span className={`text-xs ${campaignType === id ? 'text-orange-100' : 'text-gray-400'}`}>{desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            {campaignType === 'quickReply' ? (
                /* ── Quick Reply: follow-up message only ── */
                <div className="mb-4 border rounded-xl p-4 bg-amber-50 border-amber-200">
                    <label className="block mb-1.5 font-semibold text-sm">Follow-up message </label>
                    <textarea
                        className="w-full p-3 border border-amber-300 rounded-lg text-sm bg-white"
                        rows="4"
                        value={followUpMessage}
                        onChange={(e) => setFollowUpMessage(e.target.value)}
                        placeholder="e.g. Thank you! Here are the details of our upcoming retreat: https://urbanpilgrim.in/retreat — Urban Pilgrim Team"
                    />
                    <p className="mt-1.5 text-xs text-amber-600">This message is saved to Firestore and sent automatically when a user replies YES.</p>
                </div>
            ) : (
                /* ── Promotional: message + media ── */
                <>
                    {/* Message Input */}
                    <div className="mb-4">
                        <label className="block mb-2 font-semibold">Message</label>
                        <textarea
                            className="w-full p-3 border rounded-lg"
                            rows="3"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Welcome to Urban Pilgrim!"
                        />
                    </div>

            {/* Media upload */}
            <div className="mb-6 border rounded-xl p-4 bg-gray-50">
                <p className="font-semibold mb-2">
                    Media{' '}
                    <span className="text-xs font-normal text-gray-500">
                        (optional — attach a photo or video to send with_media template)
                    </span>
                </p>

                {/* File picker trigger */}
                {!mediaFile ? (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-[#C5703F] hover:text-[#C5703F] transition-colors"
                    >
                        Choose photo / video
                    </button>
                ) : (
                    <div className="space-y-2">
                        {/* Preview */}
                        {mediaPreview && (
                            <div className="relative w-40 h-28 rounded-lg overflow-hidden border bg-black">
                                {mediaFile.type.startsWith('video/') ? (
                                    <video src={mediaPreview} className="w-full h-full object-cover" muted />
                                ) : (
                                    <img src={mediaPreview} alt="preview" className="w-full h-full object-cover" />
                                )}
                            </div>
                        )}

                        {/* Upload progress */}
                        {uploadLoading ? (
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <span className="inline-block w-4 h-4 border-2 border-[#C5703F] border-t-transparent rounded-full animate-spin" />
                                    Uploading… {uploadProgress}%
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div
                                        className="bg-[#C5703F] h-1.5 rounded-full transition-all duration-200"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        ) : mediaVar ? (
                            <p className="text-xs text-green-700 font-medium">✅ Uploaded — will send with media template</p>
                        ) : null}

                        {/* File name + clear */}
                        <div className="flex items-center gap-3 text-sm">
                            <span className="text-gray-600 truncate max-w-[240px]">{mediaFile.name}</span>
                            <button
                                type="button"
                                onClick={clearMedia}
                                className="text-red-500 hover:text-red-700 text-xs font-medium shrink-0"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                )}

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleMediaChange}
                />
            </div>

                </>
            )}

            {/* Recipients — mode toggle + list */}
            <div className="mb-6">
                {/* Mode tabs */}
                <div className="flex gap-2 mb-4">
                    {['database', 'excel'].map((mode) => (
                        <button
                            key={mode}
                            type="button"
                            onClick={() => setRecipientMode(mode)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                                recipientMode === mode
                                    ? 'bg-[#C5703F] text-white border-[#C5703F]'
                                    : 'bg-white text-gray-600 border-gray-300 hover:border-[#C5703F] hover:text-[#C5703F]'
                            }`}
                        >
                            {mode === 'database' ? 'Database Users' : 'Import from Excel'}
                        </button>
                    ))}
                </div>

                {recipientMode === 'database' ? (
                    /* ── Database user list ── */
                    <>
                        <div className="flex md:flex-row flex-col items-center justify-between mb-2">
                            <label className="font-semibold">
                                Recipients
                                {!fetchLoading && (
                                    <span className="ml-2 text-sm font-normal text-gray-500">
                                        ({users.length} user{users.length !== 1 ? 's' : ''}
                                        {selectedPhones.size > 0 && `, ${selectedPhones.size} selected`})
                                    </span>
                                )}
                            </label>
                            {!fetchLoading && users.length > 0 && (
                                <input
                                    type="text"
                                    className="border rounded-lg px-3 py-1.5 text-sm w-56"
                                    placeholder="Search name, phone, email…"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            )}
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                            {fetchLoading ? (
                                <div className="flex items-center justify-center py-10 text-gray-500 text-sm">
                                    Loading users from Firestore…
                                </div>
                            ) : users.length === 0 ? (
                                <div className="flex items-center justify-center py-10 text-gray-400 text-sm">
                                    No users with WhatsApp numbers found.
                                </div>
                            ) : (
                                <>
                                    <div className="grid bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide"
                                        style={{ gridTemplateColumns: '32px 32px 1fr 1fr 1fr' }}>
                                        <button
                                            onClick={toggleAll}
                                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                allFilteredSelected ? 'bg-green-500 border-green-500' : 'border-gray-400 hover:border-green-400'
                                            }`}
                                            title={allFilteredSelected ? 'Deselect all' : 'Select all'}
                                        >
                                            {allFilteredSelected && <span className="w-2 h-2 rounded-full bg-white block" />}
                                        </button>
                                        <span>#</span><span>Name</span><span>Phone</span><span>Email</span>
                                    </div>
                                    <div className="max-h-72 overflow-y-auto divide-y">
                                        {filteredUsers.map((u, idx) => {
                                            const isSelected = selectedPhones.has(u.phone);
                                            return (
                                                <div key={u.phone}
                                                    className={`grid px-4 py-2.5 text-sm cursor-pointer ${
                                                        isSelected ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'
                                                    }`}
                                                    style={{ gridTemplateColumns: '32px 32px 1fr 1fr 1fr' }}
                                                    onClick={() => toggleOne(u.phone)}
                                                >
                                                    <span className="flex items-center">
                                                        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                            isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300'
                                                        }`}>
                                                            {isSelected && <span className="w-2 h-2 rounded-full bg-white block" />}
                                                        </span>
                                                    </span>
                                                    <span className="text-gray-400">{idx + 1}.</span>
                                                    <span className="font-medium text-gray-800">{u.name}</span>
                                                    <span className="text-gray-600 font-mono">{u.phone}</span>
                                                    <span className="text-gray-400 truncate">{u.email}</span>
                                                </div>
                                            );
                                        })}
                                        {filteredUsers.length === 0 && (
                                            <div className="px-4 py-6 text-center text-sm text-gray-400">No results match your search.</div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </>
                ) : (
                    /* ── Excel import ── */
                    <div className="border rounded-xl p-4 bg-gray-50">
                        <p className="text-sm text-gray-500 mb-3">
                            Upload an <strong>.xlsx / .xls / .csv</strong> file with a <strong>Name</strong> column and a
                            <strong> Phone / WhatsApp / Mobile</strong> column in the first row.
                        </p>

                        {!excelFile ? (
                            <button
                                type="button"
                                onClick={() => excelInputRef.current?.click()}
                                className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-[#C5703F] hover:text-[#C5703F] transition-colors"
                            >
                                Choose Excel / CSV file
                            </button>
                        ) : (
                            <div className="flex items-center gap-3 mb-3 text-sm">
                                <span className="text-gray-700 font-medium truncate max-w-[260px]">{excelFile.name}</span>
                                <button type="button" onClick={clearExcel}
                                    className="text-red-500 hover:text-red-700 text-xs font-medium shrink-0">
                                    Remove
                                </button>
                            </div>
                        )}

                        <input ref={excelInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelChange} />

                        {excelError && (
                            <p className="mt-2 text-xs text-red-600 font-medium">{excelError}</p>
                        )}

                        {importedUsers.length > 0 && (
                            <div className="mt-3 border rounded-lg overflow-hidden">
                                <div className="grid bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-600 uppercase tracking-wide"
                                    style={{ gridTemplateColumns: '32px 32px 1fr 1fr' }}>
                                    <button
                                        onClick={toggleAllImported}
                                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                            allImportedSelected ? 'bg-green-500 border-green-500' : 'border-gray-400 hover:border-green-400'
                                        }`}
                                        title={allImportedSelected ? 'Deselect all' : 'Select all'}
                                    >
                                        {allImportedSelected && <span className="w-2 h-2 rounded-full bg-white block" />}
                                    </button>
                                    <span>#</span><span>Name</span><span>Phone</span>
                                </div>
                                <div className="max-h-72 overflow-y-auto divide-y">
                                    {importedUsers.map((u, idx) => {
                                        const isSelected = selectedImportedPhones.has(u.phone);
                                        return (
                                            <div key={u.phone}
                                                className={`grid px-4 py-2.5 text-sm cursor-pointer ${
                                                    isSelected ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'
                                                }`}
                                                style={{ gridTemplateColumns: '32px 32px 1fr 1fr' }}
                                                onClick={() => toggleOneImported(u.phone)}
                                            >
                                                <span className="flex items-center">
                                                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                                                        isSelected ? 'bg-green-500 border-green-500' : 'border-gray-300'
                                                    }`}>
                                                        {isSelected && <span className="w-2 h-2 rounded-full bg-white block" />}
                                                    </span>
                                                </span>
                                                <span className="text-gray-400">{idx + 1}.</span>
                                                <span className="font-medium text-gray-800">{u.name}</span>
                                                <span className="text-gray-600 font-mono">{u.phone}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-500">
                                    {selectedImportedPhones.size} of {importedUsers.length} selected
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Send Button */}
            <div className="mb-6">
                <button
                    onClick={sendMessages}
                    disabled={
                        loading || uploadLoading ||
                        (campaignType === 'quickReply' && !followUpMessage.trim()) ||
                        (recipientMode === 'database' && (fetchLoading || users.length === 0)) ||
                        (recipientMode === 'excel' && importedUsers.length === 0)
                    }
                    className="bg-[#C5703F] text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                    {loading ? 'Sending…'
                        : uploadLoading ? 'Uploading media…'
                        : campaignType === 'quickReply'
                            ? recipientMode === 'excel'
                                ? `Send Quick Reply to ${selectedImportedPhones.size || importedUsers.length}`
                                : `Send Quick Reply to ${selectedPhones.size || users.length} User${(selectedPhones.size || users.length) !== 1 ? 's' : ''}`
                        : recipientMode === 'excel'
                            ? selectedImportedPhones.size > 0
                                ? `Send to ${selectedImportedPhones.size} Selected`
                                : `Send to All ${importedUsers.length} Imported`
                            : selectedPhones.size > 0
                                ? `Send to ${selectedPhones.size} Selected User${selectedPhones.size !== 1 ? 's' : ''}`
                                : `Send to All ${users.length} User${users.length !== 1 ? 's' : ''}`
                    }
                </button>
            </div>

            {/* Results */}
            {result && (
                <div className={`p-4 rounded-lg ${result.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                    <h3 className={`font-bold mb-2 ${result.type === 'success' ? 'text-green-800' : 'text-red-800'
                        }`}>
                        {result.message}
                    </h3>
                    {result.details?.errors?.length > 0 && (
                        <details className="mt-2">
                            <summary className="cursor-pointer text-sm font-semibold">
                                Show Errors ({result.details.errors.length})
                            </summary>
                            <ul className="mt-2 text-sm space-y-1">
                                {result.details.errors.map((err, idx) => (
                                    <li key={idx} className="text-red-700">• {err}</li>
                                ))}
                            </ul>
                        </details>
                    )}
                </div>
            )}
        </div>
    );
};

export default BulkWhatsAppSender;
