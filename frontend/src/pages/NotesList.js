import React, { useEffect, useState } from 'react';
import { getNotes, deleteNote } from '../services/noteService';
import { Link } from 'react-router-dom';

function NotesList() {
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const res = await getNotes();
      setNotes(res.data);
    } catch (err) {
      console.error('Erreur lors du chargement des notes', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNote(id);
      setNotes(notes.filter(note => note._id !== id));
    } catch (err) {
      console.error('Erreur lors de la suppression', err);
    }
  };

  return (
    <div>
      <h1>Mes Notes</h1>
      <Link to="/add">Ajouter une note</Link>
      <ul>
        {notes.map(note => (
          <li key={note._id}>
            {note.content}
            <button onClick={() => handleDelete(note._id)}>Supprimer</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default NotesList;
