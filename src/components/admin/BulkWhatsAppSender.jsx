import { useState } from 'react';
import { 
    sendBulkWhatsApp, 
    validatePhoneNumbers 
} from '../../services/whatsappService';

const BulkWhatsAppSender = () => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [message, setMessage] = useState('');
    const [manualUsers, setManualUsers] = useState('');

    // Example 2: Send to users from textarea input
    const sendToInputUsers = async () => {
        setLoading(true);
        setResult(null);
        
        try {
            // Parse textarea input (format: +919876543210,Name or one per line)
            const lines = manualUsers.split('\n').filter(line => line.trim());
            const users = lines.map(line => {
                const [phone, name] = line.split(',').map(s => s.trim());
                return { phone, name: name || 'User' };
            });

            // Validate phone numbers
            const { valid, invalid } = validatePhoneNumbers(users);
            
            if (invalid.length > 0) {
                console.warn('Invalid numbers:', invalid);
            }

            if (valid.length === 0) {
                throw new Error('No valid phone numbers found');
            }

            const messageText = message || "Hi {name}, Welcome to Urban Pilgrim! 🧘‍♀️";

            const options = {
                useTemplate: true, 
                contentSid: "HX700570ab7b8cec6466b9d6464153390c" 
            };

            const res = await sendBulkWhatsApp(valid, messageText, options);
            
            setResult({
                type: 'success',
                message: `✅ Sent: ${res.success}, ❌ Failed: ${res.failed}, ⚠️ Invalid: ${invalid.length}`,
                details: res
            });
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
            
            {/* Message Input */}
            <div className="mb-4">
                <label className="block mb-2 font-semibold">
                    Message
                </label>
                <textarea
                    className="w-full p-3 border rounded-lg"
                    rows="3"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Welcome to Urban Pilgrim! 🧘‍♀️"
                />
            </div>

            {/* Manual Users Input */}
            <div className="mb-4">
                <label className="block mb-2 font-semibold">
                    Manual Phone Numbers (one per line: +919876543210,Name)
                </label>
                <textarea
                    className="w-full p-3 border rounded-lg font-mono text-sm"
                    rows="5"
                    value={manualUsers}
                    onChange={(e) => setManualUsers(e.target.value)}
                    placeholder="+919876543210,Rahul Kumar&#10;+918765432109,Priya Sharma&#10;+917654321098,Amit Patel"
                />
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <button
                    onClick={sendToInputUsers}
                    disabled={loading || !manualUsers.trim()}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                    {loading ? '⏳ Sending...' : '📤 Send to Input Numbers'}
                </button>
            </div>

            {/* Results */}
            {result && (
                <div className={`p-4 rounded-lg ${
                    result.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                    <h3 className={`font-bold mb-2 ${
                        result.type === 'success' ? 'text-green-800' : 'text-red-800'
                    }`}>
                        {result.message}
                    </h3>
                    {result.details.errors && result.details.errors.length > 0 && (
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
