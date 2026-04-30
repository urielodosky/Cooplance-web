import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../auth/context/AuthContext';
import { Hash, Lock, Send, Paperclip, MessageSquare, User, Briefcase, Plus, ChevronDown, ChevronRight } from 'lucide-react';

const CoopChat = ({ coopId, amIOwner, amIAdmin }) => {
    const { user } = useAuth();
    const [channels, setChannels] = useState([]);
    const [members, setMembers] = useState([]);
    const [activeJobs, setActiveJobs] = useState([]);
    const [activeChannel, setActiveChannel] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [clientsExpanded, setClientsExpanded] = useState(true);
    const [membersExpanded, setMembersExpanded] = useState(true);
    const [extrasExpanded, setExtrasExpanded] = useState(true);
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
            fetchMessages(activeChannel);
            const msgSub = subscribeToMessages(activeChannel);
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
            // 1. Fetch user role locally for safety
            const { data: myMember } = await supabase
                .from('coop_members')
                .select('role')
                .eq('coop_id', coopId)
                .eq('user_id', user.id)
                .single();
            
            const isAuthorized = myMember?.role === 'owner' || myMember?.role === 'admin' || amIOwner || amIAdmin;

            // 2. Fetch Channels
            let { data: channelsData, error: channelsError } = await supabase
                .from('coop_channels')
                .select('*')
                .eq('coop_id', coopId)
                .order('created_at', { ascending: true });

            if (channelsError) throw channelsError;

            // 3. Ensure General channel exists
            let general = (channelsData || []).find(c => c.type === 'general');
            if (!general && isAuthorized) {
                const { data: newChan, error: createError } = await supabase
                    .from('coop_channels')
                    .insert({
                        coop_id: coopId,
                        type: 'general',
                        name: 'General'
                    })
                    .select()
                    .single();
                
                if (!createError && newChan) {
                    channelsData = [...(channelsData || []), newChan];
                    general = newChan;
                }
            }

            // 4. Fetch Active Jobs (for "Clientes" section)
            const { data: jobsData } = await supabase
                .from('jobs')
                .select('*, profiles:client_id(username, avatar_url), participants:job_participants(*)')
                .eq('team_id', coopId)
                .eq('status', 'active');

            // 5. Fetch Members (for DMs)
            const { data: membersData, error: membersError } = await supabase
                .from('coop_members')
                .select('*, profiles(*)')
                .eq('coop_id', coopId)
                .neq('user_id', user.id);

            if (membersError) throw membersError;

            setChannels(channelsData || []);
            setActiveJobs(jobsData || []);
            setMembers(membersData || []);
            
            // Set General as default or the first one
            const defaultChan = general || (channelsData || [])[0];
            if (defaultChan) setActiveChannel(defaultChan);
        } catch (err) {
            console.error('Error fetching chat data:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMessages = async (channel) => {
        try {
            let query;
            if (channel.type === 'client_chat') {
                query = supabase
                    .from('messages')
                    .select('*, profiles:user_id(username, first_name, last_name, avatar_url)')
                    .eq('job_id', channel.id)
                    .order('created_at', { ascending: true });
            } else {
                query = supabase
                    .from('coop_messages')
                    .select('*, profiles(username, first_name, last_name, avatar_url)')
                    .eq('channel_id', channel.id)
                    .order('created_at', { ascending: true });
            }

            const { data, error } = await query;
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

    const subscribeToMessages = (channel) => {
        const table = channel.type === 'client_chat' ? 'messages' : 'coop_messages';
        const filter = channel.type === 'client_chat' ? `job_id=eq.${channel.id}` : `channel_id=eq.${channel.id}`;

        return supabase
            .channel(`room-${channel.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table, filter }, async (payload) => {
                const senderId = payload.new.sender_id || payload.new.user_id;
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('username, first_name, last_name, avatar_url')
                    .eq('id', senderId)
                    .single();
                
                const newMessage = { ...payload.new, profiles: profile };
                setMessages(prev => [...prev, newMessage]);
            })
            .subscribe();
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChannel) return;

        // Restriction: Only lead can chat in Clientes section
        if (activeChannel.type === 'client_chat' && activeChannel.job?.assignee_id !== user.id) {
            alert('Solo el encargado de este servicio puede chatear con el cliente.');
            return;
        }

        const content = newMessage.trim();
        setNewMessage('');

        try {
            let error;
            if (activeChannel.type === 'client_chat') {
                const { error: err } = await supabase
                    .from('messages')
                    .insert({
                        job_id: activeChannel.id,
                        user_id: user.id,
                        content: content
                    });
                error = err;
            } else {
                const { error: err } = await supabase
                    .from('coop_messages')
                    .insert({
                        channel_id: activeChannel.id,
                        sender_id: user.id,
                        content: content
                    });
                error = err;
            }

            if (error) throw error;
        } catch (err) {
            console.error('Error sending message:', err);
            setNewMessage(content); 
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
        } finally {
            setUploading(false);
        }
    };

    const getDirectChannel = async (otherUserId) => {
        const existing = channels.find(c => 
            c.type === 'direct' && 
            c.member_ids?.includes(otherUserId) && 
            c.member_ids?.includes(user.id)
        );

        if (existing) {
            setActiveChannel(existing);
            return;
        }

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

    if (loading) return (
        <div style={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            Sincronizando Workspace...
        </div>
    );

    return (
        <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '280px 1fr', 
            height: '700px', 
            background: 'rgba(15, 17, 26, 0.4)', 
            backdropFilter: 'blur(10px)',
            borderRadius: '28px', 
            overflow: 'hidden', 
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
        }}>
            
            {/* SIDEBAR - Workspace Style */}
            <div style={{ 
                background: 'rgba(255,255,255,0.02)', 
                borderRight: '1px solid rgba(255,255,255,0.05)', 
                display: 'flex', 
                flexDirection: 'column', 
                overflowY: 'auto' 
            }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'var(--primary)' }}></div>
                        WORKSPACE
                    </h2>
                </div>

                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* 1. General Button */}
                    <div style={{ marginBottom: '0.5rem' }}>
                        <button 
                            onClick={() => {
                                const gen = channels.find(c => c.type === 'general');
                                if (gen) setActiveChannel(gen);
                            }}
                            style={{
                                width: '100%', textAlign: 'left', padding: '0.8rem 1rem', borderRadius: '14px', border: 'none',
                                background: activeChannel?.type === 'general' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255,255,255,0.02)',
                                color: activeChannel?.type === 'general' ? 'white' : 'var(--text-secondary)',
                                fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s',
                                display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.95rem',
                                border: activeChannel?.type === 'general' ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(255,255,255,0.05)'
                            }}
                        >
                            <MessageSquare size={18} style={{ color: activeChannel?.type === 'general' ? 'var(--primary)' : 'var(--text-muted)' }} />
                            GENERAL
                        </button>
                    </div>

                    {/* 2. Clientes (Jobs) */}
                    <div>
                        <button 
                            onClick={() => setClientsExpanded(!clientsExpanded)}
                            style={{ 
                                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer',
                                color: 'var(--text-muted)', marginBottom: '0.4rem'
                            }}
                        >
                            <span style={{ fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.5px' }}>CLIENTES</span>
                            {clientsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        
                        {clientsExpanded && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {activeJobs.length > 0 ? activeJobs.map(job => (
                                    <button 
                                        key={job.id} 
                                        onClick={() => setActiveChannel({ 
                                            id: job.id, 
                                            type: 'client_chat', 
                                            name: job.service_title || 'Servicio',
                                            job: job
                                        })}
                                        style={{
                                            textAlign: 'left', padding: '0.6rem 0.8rem', borderRadius: '12px', border: 'none',
                                            background: activeChannel?.id === job.id && activeChannel.type === 'client_chat' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                                            color: activeChannel?.id === job.id && activeChannel.type === 'client_chat' ? '#10b981' : 'var(--text-secondary)',
                                            fontWeight: activeChannel?.id === job.id ? '700' : '500', cursor: 'pointer', transition: 'all 0.2s',
                                            display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.9rem'
                                        }}
                                    >
                                        <Briefcase size={14} style={{ opacity: 0.7 }} />
                                        {job.service_title?.substring(0, 20)}...
                                    </button>
                                )) : <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingLeft: '0.8rem' }}>Sin clientes activos</p>}
                            </div>
                        )}
                    </div>

                    {/* 3. Miembros (DMs) */}
                    <div>
                        <button 
                            onClick={() => setMembersExpanded(!membersExpanded)}
                            style={{ 
                                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer',
                                color: 'var(--text-muted)', marginBottom: '0.4rem'
                            }}
                        >
                            <span style={{ fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.5px' }}>MIEMBROS</span>
                            {membersExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>

                        {membersExpanded && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {members.map(m => (
                                    <button 
                                        key={m.user_id} 
                                        onClick={() => getDirectChannel(m.user_id)}
                                        style={{
                                            textAlign: 'left', padding: '0.6rem 0.8rem', borderRadius: '12px', border: 'none',
                                            background: activeChannel?.type === 'direct' && activeChannel.member_ids?.includes(m.user_id) ? 'rgba(255,255,255,0.05)' : 'transparent',
                                            color: activeChannel?.type === 'direct' && activeChannel.member_ids?.includes(m.user_id) ? 'white' : 'var(--text-secondary)',
                                            fontWeight: activeChannel?.type === 'direct' && activeChannel.member_ids?.includes(m.user_id) ? '700' : '500', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.9rem'
                                        }}
                                    >
                                        <div style={{ position: 'relative' }}>
                                            {m.profiles?.avatar_url ? (
                                                <img src={m.profiles.avatar_url} style={{ width: '24px', height: '24px', borderRadius: '8px', objectFit: 'cover' }} alt="" />
                                            ) : (
                                                <div style={{ width: '24px', height: '24px', borderRadius: '8px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: 'white' }}>
                                                    {m.profiles?.username?.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        {m.profiles?.username}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 4. Extras (Custom Channels) */}
                    <div>
                        <button 
                            onClick={() => setExtrasExpanded(!extrasExpanded)}
                            style={{ 
                                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer',
                                color: 'var(--text-muted)', marginBottom: '0.4rem'
                            }}
                        >
                            <span style={{ fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.5px' }}>EXTRAS</span>
                            {extrasExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        
                        {extrasExpanded && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {channels.filter(c => !['general', 'direct', 'project'].includes(c.type)).map(c => (
                                    <button 
                                        key={c.id} 
                                        onClick={() => setActiveChannel(c)}
                                        style={{
                                            textAlign: 'left', padding: '0.6rem 0.8rem', borderRadius: '12px', border: 'none',
                                            background: activeChannel?.id === c.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                                            color: activeChannel?.id === c.id ? 'white' : 'var(--text-secondary)',
                                            fontWeight: activeChannel?.id === c.id ? '700' : '500', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.9rem'
                                        }}
                                    >
                                        <Hash size={14} style={{ opacity: 0.7 }} />
                                        {c.name}
                                    </button>
                                ))}
                                {(amIOwner || amIAdmin) && (
                                    <button style={{ 
                                        background: 'none', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px', 
                                        padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem'
                                    }}>
                                        <Plus size={14} /> Crear Canal
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* CHAT WINDOW */}
            <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.01)' }}>
                
                {/* Header */}
                <div style={{ 
                    padding: '1.2rem 2rem', 
                    borderBottom: '1px solid rgba(255,255,255,0.05)', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.02)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                            {activeChannel?.type === 'direct' ? <User size={20} /> : activeChannel?.type === 'project' || activeChannel?.type === 'client_chat' ? <Briefcase size={20} /> : <MessageSquare size={20} />}
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800' }}>
                                {activeChannel ? (
                                    activeChannel.type === 'direct' ? (
                                        members.find(m => activeChannel.member_ids?.includes(m.user_id))?.profiles?.username || 'Chat Privado'
                                    ) : (
                                        activeChannel.name || 'Canal'
                                    )
                                ) : 'Workspace Inactivo'}
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: activeChannel ? '#10b981' : 'var(--text-muted)' }}></div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {activeChannel?.type === 'client_chat' ? 'Chat con Cliente' : activeChannel?.type === 'project' ? 'Grupo de Trabajo' : 'Canal del Equipo'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Work Group Button (Only for Client Chat) */}
                    {activeChannel?.type === 'client_chat' && (
                        <button 
                            onClick={() => {
                                const internal = channels.find(c => c.type === 'project' && c.reference_id === activeChannel.id);
                                if (internal) setActiveChannel(internal);
                            }}
                            style={{
                                padding: '0.5rem 1rem', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.1)',
                                color: 'var(--primary)', border: '1px solid rgba(139, 92, 246, 0.2)', fontSize: '0.8rem',
                                fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}
                        >
                            <User size={14} /> Grupo de Trabajo
                        </button>
                    )}
                </div>

                {/* Messages List */}
                <div style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    padding: '2rem', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '1.5rem',
                    scrollbarWidth: 'thin'
                }}>
                    {messages.length === 0 ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', opacity: 0.3 }}>
                            <MessageSquare size={48} />
                            <p style={{ fontWeight: '600' }}>No hay mensajes aún. ¡Comienza la conversación!</p>
                        </div>
                    ) : (
                        messages.map((msg, i) => {
                            const isMe = msg.sender_id === user.id || msg.user_id === user.id;
                            return (
                                <div key={msg.id} style={{ 
                                    display: 'flex', 
                                    flexDirection: isMe ? 'row-reverse' : 'row',
                                    gap: '1rem',
                                    alignItems: 'flex-end'
                                }}>
                                    {!isMe && (
                                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--primary)', flexShrink: 0, overflow: 'hidden' }}>
                                            {msg.profiles?.avatar_url ? <img src={msg.profiles.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem' }}>{msg.profiles?.username?.charAt(0)}</div>}
                                        </div>
                                    )}
                                    <div style={{ 
                                        maxWidth: '70%', 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: isMe ? 'flex-end' : 'flex-start' 
                                    }}>
                                        {!isMe && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px', marginLeft: '4px' }}>{msg.profiles?.username}</span>}
                                        <div style={{ 
                                            padding: '0.8rem 1.2rem', 
                                            borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                            background: isMe ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                            color: isMe ? 'white' : 'var(--text-primary)',
                                            fontSize: '0.95rem',
                                            lineHeight: '1.5',
                                            boxShadow: isMe ? '0 4px 15px rgba(139, 92, 246, 0.2)' : 'none',
                                            border: isMe ? 'none' : '1px solid rgba(255,255,255,0.05)'
                                        }}>
                                            {msg.content}
                                            {msg.attachments?.map((att, j) => (
                                                <div key={j} style={{ marginTop: '0.8rem' }}>
                                                    {att.type.startsWith('image') ? (
                                                        <img src={att.url} alt={att.name} style={{ maxWidth: '100%', borderRadius: '12px' }} />
                                                    ) : (
                                                        <a href={att.url} target="_blank" rel="noreferrer" style={{ 
                                                            display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem', background: 'rgba(0,0,0,0.2)', 
                                                            borderRadius: '8px', textDecoration: 'none', color: isMe ? 'white' : 'var(--primary)', fontSize: '0.8rem'
                                                        }}>
                                                            <Paperclip size={14} /> {att.name}
                                                        </a>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area - Redesigned */}
                <div style={{ padding: '1.5rem 2rem' }}>
                    <form onSubmit={handleSendMessage} style={{ 
                        display: 'flex', 
                        gap: '0.8rem', 
                        background: 'rgba(255,255,255,0.03)', 
                        padding: '0.6rem', 
                        borderRadius: '20px', 
                        border: '1px solid rgba(255,255,255,0.08)',
                        alignItems: 'center'
                    }}>
                        <button 
                            type="button" 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            style={{ 
                                background: 'rgba(255,255,255,0.03)', border: 'none', color: 'var(--text-muted)', 
                                cursor: 'pointer', width: '40px', height: '40px', borderRadius: '14px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        >
                            <Paperclip size={20} />
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
                            placeholder={activeChannel ? `Escribe un mensaje en ${activeChannel.name}...` : "Escribe un mensaje..."}
                            style={{ 
                                flex: 1, background: 'none', border: 'none', color: 'white', outline: 'none', padding: '0.5rem',
                                fontSize: '0.95rem'
                            }}
                        />
                        <button 
                            type="submit" 
                            disabled={!newMessage.trim() || uploading}
                            style={{ 
                                background: 'var(--primary)', 
                                border: 'none', 
                                color: 'white', 
                                width: '40px', 
                                height: '40px', 
                                borderRadius: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                opacity: !newMessage.trim() ? 0.5 : 1,
                                boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
                            }}
                        >
                            <Send size={18} />
                        </button>
                    </form>
                    {uploading && <p style={{ fontSize: '0.7rem', color: 'var(--primary)', marginTop: '0.6rem', textAlign: 'center' }}>Sincronizando archivo...</p>}
                </div>
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); borderRadius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
            `}</style>
        </div>
    );
};

export default CoopChat;
