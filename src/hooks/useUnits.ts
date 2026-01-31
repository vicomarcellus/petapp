import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface Unit {
    id: number;
    code: string;
    name: string;
    category: 'medication' | 'feeding' | 'both';
    sort_order: number;
}

export const useUnits = () => {
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUnits = async () => {
            try {
                const { data, error } = await supabase
                    .from('units')
                    .select('*')
                    .order('sort_order', { ascending: true });

                if (error) {
                    console.error('Error fetching units:', error);
                    setError(error.message);
                    // Fallback to hardcoded units if DB fails
                    setUnits([
                        { id: 1, code: 'ml', name: 'мл', category: 'both', sort_order: 1 },
                        { id: 2, code: 'g', name: 'г', category: 'both', sort_order: 2 }
                    ]);
                } else {
                    setUnits(data || []);
                }
            } catch (err) {
                console.error('Error fetching units:', err);
                setError(String(err));
                // Fallback to hardcoded units
                setUnits([
                    { id: 1, code: 'ml', name: 'мл', category: 'both', sort_order: 1 },
                    { id: 2, code: 'g', name: 'г', category: 'both', sort_order: 2 }
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchUnits();
    }, []);

    // Helper to get units for a specific category
    const getMedicationUnits = () => units.filter(u => u.category === 'medication' || u.category === 'both');
    const getFeedingUnits = () => units.filter(u => u.category === 'feeding' || u.category === 'both');

    return {
        units,
        loading,
        error,
        medicationUnits: getMedicationUnits(),
        feedingUnits: getFeedingUnits()
    };
};
