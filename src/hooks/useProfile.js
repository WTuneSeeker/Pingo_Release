import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export function useProfile() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isPremium, setIsPremium] = useState(false);

    useEffect(() => {
        async function fetchProfile() {
            try {
                // Haal de ingelogde gebruiker op
                const { data: { user } } = await supabase.auth.getUser();
                
                if (user) {
                    // Haal het bijbehorende profiel op (inclusief abonnement status)
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single();

                    if (data) {
                        setProfile(data);
                        // Check of de status 'pro' is
                        setIsPremium(data.subscription_status === 'pro');
                    }
                }
            } catch (error) {
                console.error("Fout bij laden profiel:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchProfile();
    }, []);

    return { profile, loading, isPremium };
}