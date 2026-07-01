import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

type MockDoc = { id: string; [key: string]: unknown };

export default function DataPage() {
    const [rows, setRows] = useState<MockDoc[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                // const snap holds the name of the database we use, for now 'post'
                const snap = await getDocs(collection(db, 'post'));
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setRows(data);
            } catch (e: any) {
                setError(e?.message ?? 'Failed to load data');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <main style={{ padding: 24 }}>
            <h1>Live Data</h1>
            {loading && <p>Loading…</p>}
            {error && <p style={{ color: 'crimson' }}>{error}</p>}
            {!loading && !error && (
                <pre style={{ background: '#f6f8fa', padding: 16, borderRadius: 8 }}>
{JSON.stringify(rows, null, 2)}
        </pre>
            )}
        </main>
    );
}