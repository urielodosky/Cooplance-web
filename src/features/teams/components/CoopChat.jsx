import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/context/AuthContext';

const CoopChat = ({ coopId, amIOwner, amIAdmin }) => {
    const { user } = useAuth();
    const [channels, setChannels] = useState([]);
    const [members, setMembers] = useState([]);
    const [activeChannel, setActiveChannel] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (coopId) {
            fetchInitialData();
            const subscription = subscribeToChannels();
            return () => {
                supabase.removeChannel(subscription);
            };
        }
    }, [coopId]);

    useEffect(() => {
        if (activeChannel) {
            fetchMessages(activeChannel.id);
            const msgSub = subscribeToMessages(activeChannel.id);
            return () => {
                supabase.removeChannel(msgSub);
            };
        }
    }, [activeChannel]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Channels
            const { data: channelsData, error: channelsError } = await supabase
                .from('coop_channels')
                .select('*')
                .eq('coop_id', coopId)
                .order('created_at', { ascending: true });

            if (channelsError) throw channelsError;

            // 2. Fetch Members (for DMs)
            const { data: membersData, error: membersError } = await supabase
                .from('coop_members')
                .select('*, profiles(*)')
                .eq('coop_id', coopId)
                .neq('user_id', user.id);

            if (membersError) throw membersError;

            setChannels(channelsData || []);
            setMembers(membersData || []);
            
            // Set General as default
            const general = channelsData.find(c => c.type === 'general');
            if (general) setActiveChannel(general);
        } catch (err) {
            console.error('Error fetching chat data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (channelId) => {
        try {
            const { data, error } = await supabase
                .from('coop_messages')
                .select('*, profiles(username, first_name, last_name, avatar_url)')
                .eq('channel_id', channelId)
                .order('created_at', { ascending: true })
                .limit(100);

            if (error) throw error;
            setMessages(data || []);
        } catch (err) {
            console.error('Error fetching messages:', err);
        }
    };

    const subscribeToChannels = () => {
        return supabase
            .channel(`coop_channels:${coopId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'coop_channels', filter: `coop_id=eq.${coopId}` }, () => {
                fetchInitialData();
            })
            .subscribe();
    };

    const subscribeToMessages = (channelId) => {
        return supabase
            .channel(`coop_messages:${channelId}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'coop_messages', filter: `channel_id=eq.${channelId}` }, async (payload) => {
                // Fetch the complete message with profile info
                const { data, error } = await supabase
                    .from('coop_messages')
                    .select('*, profiles(username, first_name, last_name, avatar_url)')
                    .eq('id', payload.new.id)
                    .single();
                
                if (!error && data) {
                    setMessages(prev => [...prev, data]);
                }
            })
            .subscribe();
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChannel) return;

        const content = newMessage.trim();
        setNewMessage('');

        try {
            const { error } = await supabase
                .from('coop_messages')
                .insert({
                    channel_id: activeChannel.id,
                    sender_id: user.id,
                    content: content
                });

            if (error) throw error;
        } catch (err) {
            console.error('Error sending message:', err);
            setNewMessage(content); // Restore
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !activeChannel) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `coop_chats/${coopId}/${activeChannel.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('attachments')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('attachments')
                .getPublicUrl(filePath);

            await supabase
                .from('coop_messages')
                .insert({
                    channel_id: activeChannel.id,
                    sender_id: user.id,
                    content: '',
                    attachments: [{ url: publicUrl, type: file.type, name: file.name }]
                });

        } catch (err) {
            console.error('Error uploading file:', err);
            alert('Error al subir archivo: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    const getDirectChannel = async (otherUserId) => {
        // Check if exists
        const existing = channels.find(c => 
            c.type === 'direct' && 
            c.member_ids.includes(otherUserId) && 
            c.member_ids.includes(user.id)
        );

        if (existing) {
            setActiveChannel(existing);
            return;
        }

        // Create new
        try {
            const { data, error } = await supabase
                .from('coop_channels')
                .insert({
                    coop_id: coopId,
                    type: 'direct',
                    member_ids: [user.id, otherUserId]
                })
                .select()
                .single();

            if (error) throw error;
            setActiveChannel(data);
            setChannels(prev => [...prev, data]);
        } catch (err) {
            console.error('Error creating DM channel:', err);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    if (loading) return <div style={{ padding: '4rem', textAlign: 'center' }}>Cargando ecosistema interno...</div>;

    const generalChannels = channels.filter(c => c.type === 'general');
    const projectChannels = channels.filter(c => c.type === 'project');
    const dmChannels = channels.filter(c => c.type === 'direct');

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', height: '650px', background: 'rgba(0,0,0,0.2)', borderRadius: '24px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            
            {/* SIDEBAR */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRight: '1px solid var(--border)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem', overflowY: 'auto' }}>
                
                {/* Canales */}
                <div>
                    <h4 style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '1rem' }}># CANALES</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {generalChannels.map(c => (
                            <button 
                                key={c.id} 
                                onClick={() => setActiveChannel(c)}
                                style={{
                                    textAlign: 'left', padding: '0.6rem 0.8rem', borderRadius: '8px', border: 'none',
                                    background: activeChannel?.id === c.id ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                                    color: activeChannel?.id === c.id ? 'var(--primary)' : 'var(--text-secondary)',
                                    fontWeight: activeChannel?.id === c.id ? '700' : '500', cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                # {c.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Proyectos */}
                <div>
                    <h4 style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                        PROYECTOS INTERNOS
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {projectChannels.length > 0 ? projectChannels.map(c => (
                            <button 
                                key={c.id} 
                                onClick={() => setActiveChannel(c)}
                                style={{
                                    textAlign: 'left', padding: '0.6rem 0.8rem', borderRadius: '8px', border: 'none',
                                    background: activeChannel?.id === c.id ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                                    color: activeChannel?.id === c.id ? '#10b981' : 'var(--text-secondary)',
                                    fontWeight: activeChannel?.id === c.id ? '700' : '500', cursor: 'pointer', transition: 'all 0.2s',
                                    fontSize: '0.85rem'
                                }}
                            >
                                # {c.name.replace('Proyecto: ', '')}
                            </button>
                        )) : <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: '0.8rem' }}>Sin proyectos activos</p>}
                    </div>
                </div>

                {/* Mensajes Directos */}
                <div>
                    <h4 style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '1rem' }}>👤 MENSAJES DIRECTOS</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {members.map(m => (
                            <button 
                                key={m.user_id} 
                                onClick={() => getDirectChannel(m.user_id)}
                                style={{
                                    textAlign: 'left', padding: '0.6rem 0.8rem', borderRadius: '8px', border: 'none',
                                    background: activeChannel?.type === 'direct' && activeChannel.member_ids.includes(m.user_id) ? 'rgba(255,255,255,0.05)' : 'transparent',
                                    color: activeChannel?.type === 'direct' && activeChannel.member_ids.includes(m.user_id) ? 'white' : 'var(--text-secondary)',
                                    fontWeight: activeChannel?.type === 'direct' && activeChannel.member_ids.includes(m.user_id) ? '700' : '500', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '0.6rem'
                                }}
                            >
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                                {m.profiles?.username || 'Miembro'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* CHAT WINDOW */}
            <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                
                {/* Header */}
                <div style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                            {activeChannel?.type === 'direct' ? (
                                `Chat con ${members.find(m => activeChannel.member_ids.includes(m.user_id))?.profiles?.username || 'Miembro'}`
                            ) : (
                                `# ${activeChannel?.name || 'Canal'}`
                            )}
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {activeChannel?.type === 'project' ? '🔒 Solo para miembros asignados' : '👥 Abierto a todo el equipo'}
                        </p>
                    </div>
                    {activeChannel?.type === 'project' && (
                        <span style={{ fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 10px', borderRadius: '6px', fontWeight: '800' }}>INTERNAL PROJECT</span>
                    )}
                </div>

                {/* Messages List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {messages.map((msg, i) => (
                        <div key={msg.id} style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ 
                                width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary)', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem',
                                color: 'white', flexShrink: 0
                            }}>
                                {msg.profiles?.avatar_url ? <img src={msg.profiles.avatar_url} style={{ width: '100%', height: '100%', borderRadius: '10px', objectFit: 'cover' }} alt="" /> : (msg.profiles?.username?.charAt(0) || 'U')}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.8rem', marginBottom: '0.3rem' }}>
                                    <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>{msg.profiles?.first_name ? `${msg.profiles.first_name} ${msg.profiles.last_name || ''}` : msg.profiles?.username}</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                {msg.content && <p style={{ margin: 0, lineHeight: '1.5', color: 'var(--text-secondary)', wordBreak: 'break-word' }}>{msg.content}</p>}
                                {msg.attachments?.map((att, j) => (
                                    <div key={j} style={{ marginTop: '0.8rem' }}>
                                        {att.type.startsWith('image') ? (
                                            <img src={att.url} alt={att.name} style={{ maxWidth: '300px', borderRadius: '12px', border: '1px solid var(--border)' }} />
                                        ) : (
                                            <a href={att.url} target="_blank" rel="noreferrer" style={{ 
                                                display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', background: 'rgba(255,255,255,0.03)', 
                                                borderRadius: '10px', textDecoration: 'none', color: 'var(--primary)', border: '1px solid var(--border)', width: 'fit-content'
                                            }}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                                <span style={{ fontSize: '0.85rem' }}>{att.name}</span>
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div style={{ padding: '1.5rem 2rem', background: 'rgba(0,0,0,0.1)' }}>
                    <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '0.5rem', borderRadius: '14px', border: '1px solid var(--border)' }}>
                        <button 
                            type="button" 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            style={{ 
                                background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 0.5rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
                            style={{ display: 'none' }} 
                        />
                        <input 
                            type="text" 
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder={`Enviar mensaje a ${activeChannel?.name || 'equipo'}...`}
                            style={{ 
                                flex: 1, background: 'none', border: 'none', color: 'white', outline: 'none', padding: '0.5rem',
                                fontSize: '0.95rem'
                            }}
                        />
                        <button 
                            type="submit" 
                            disabled={!newMessage.trim() || uploading}
                            className="btn-primary" 
                            style={{ padding: '0.6rem 1.2rem', borderRadius: '10px' }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        </button>
                    </form>
                    {uploading && <p style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: '0.5rem', textAlign: 'center' }}>Subiendo archivo...</p>}
                </div>
            </div>

            <style>{`
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); borderRadius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
            `}</style>
        </div>
    );
};

export default CoopChat;
