import React, { useState } from 'react';
import { createNote } from '../services/noteService';
import { useNavigate } from 'react-router-dom';

function AddNoteForm() {
  const [content, setContent] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createNote(content);
      navigate('/'); // Retourner à la liste
    } catch (err) {
      console.error('Erreur lors de la création', err);
    }
  };

  return (
    <div>
      <h1>Ajouter une note</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Contenu de la note"
        />
        <button type="submit">Ajouter</button>
      </form>
    </div>
  );
}

export default AddNoteForm;
