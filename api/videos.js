import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { title, description, url, file_name, size } = req.body;
      const { data, error } = await supabase
        .from('videos')
        .insert({ title, description, url, file_name, size })
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      // Get video info to delete from storage too
      const { data: video } = await supabase.from('videos').select('*').eq('id', id).single();
      
      if (video?.url) {
        // Extract path from URL and delete from storage
        try {
          const urlParts = video.url.split('/videos/');
          if (urlParts.length > 1) {
            const filePath = urlParts[1].split('?')[0];
            await supabase.storage.from('videos').remove([filePath]);
          }
        } catch (e) {
          console.log('Storage delete error:', e.message);
        }
      }

      const { error } = await supabase.from('videos').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'PUT') {
      const { id, title, description } = req.body;
      const { data, error } = await supabase
        .from('videos')
        .update({ title, description })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
