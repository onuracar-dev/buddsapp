import React from 'react';
import { supabase } from '../../supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function XoxGame({ msg }) {
  const { currentUser } = useAuth();
  
  // msg.content JSON formatında bir state tutar.
  let gameState;
  try {
    gameState = JSON.parse(msg.content);
  } catch (e) {
    return <div>Oyun verisi bozuk.</div>;
  }

  const { board, playerX, playerO, turn, winner } = gameState;

  const handleMove = async (index) => {
    if (winner || board[index] !== null) return;
    
    // Eğer oyuncu ataması yapılmadıysa ilk tıklayan X, ikinci O olur.
    let newPlayerX = playerX;
    let newPlayerO = playerO;
    
    if (!newPlayerX) {
      newPlayerX = currentUser.id;
    } else if (!newPlayerO && newPlayerX !== currentUser.id) {
      newPlayerO = currentUser.id;
    }

    // Sıra kontrolü
    if (newPlayerX && newPlayerO) {
      const isMyTurn = (turn === 'X' && newPlayerX === currentUser.id) || (turn === 'O' && newPlayerO === currentUser.id);
      if (!isMyTurn) return; // Benim sıram değil
    }

    // Benim işaretim nedir?
    const mySymbol = (newPlayerX === currentUser.id) ? 'X' : (newPlayerO === currentUser.id ? 'O' : null);
    if (!mySymbol) return; // İzleyici (3. kişi) tıklayamaz
    
    // Eğer oyun tam başlamadıysa (oyuncu bekleniyorsa) ama ilk hamlemi yapıyorsam turn bende demektir
    if (!newPlayerO && mySymbol === 'X' && turn !== 'X') return;

    const newBoard = [...board];
    newBoard[index] = mySymbol;

    const checkWinner = (squares) => {
      const lines = [[0,1,2], [3,4,5], [6,7,8], [0,3,6], [1,4,7], [2,5,8], [0,4,8], [2,4,6]];
      for (let i = 0; i < lines.length; i++) {
        const [a, b, c] = lines[i];
        if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
          return squares[a];
        }
      }
      if (!squares.includes(null)) return 'draw';
      return null;
    };

    const newWinner = checkWinner(newBoard);
    const newTurn = mySymbol === 'X' ? 'O' : 'X';

    const newState = {
      board: newBoard,
      playerX: newPlayerX,
      playerO: newPlayerO,
      turn: newTurn,
      winner: newWinner
    };

    // Mesajı güncelle
    await supabase.from('messages').update({ content: JSON.stringify(newState) }).eq('id', msg.id);
  };

  const resetGame = async () => {
    const newState = {
      board: Array(9).fill(null),
      playerX: null,
      playerO: null,
      turn: 'X',
      winner: null
    };
    await supabase.from('messages').update({ content: JSON.stringify(newState) }).eq('id', msg.id);
  };

  const getStatusText = () => {
    if (winner === 'draw') return 'Berabere! 🤝';
    if (winner) {
      const isMe = (winner === 'X' && playerX === currentUser.id) || (winner === 'O' && playerO === currentUser.id);
      return isMe ? 'Kazandın! 🏆' : 'Kaybettin! 💀';
    }
    if (!playerX) return 'İlk hamleyi yap (Sen X olacaksın)';
    if (!playerO && playerX === currentUser.id) return 'Rakip bekleniyor...';
    if (!playerO && playerX !== currentUser.id) return "Rakibin ol (Sen O'sun)";
    
    const isMyTurn = (turn === 'X' && playerX === currentUser.id) || (turn === 'O' && playerO === currentUser.id);
    return isMyTurn ? 'Sıra sende!' : 'Rakip düşünüyor...';
  };

  return (
    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '12px', minWidth: '220px', userSelect: 'none' }}>
      <h4 style={{ margin: '0 0 10px 0', textAlign: 'center', color: 'var(--primary)' }}>Sohbet İçi XOX 🎮</h4>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px', marginBottom: '15px', background: 'var(--border)', padding: '5px', borderRadius: '8px' }}>
        {board.map((cell, index) => (
          <div 
            key={index} 
            onClick={() => handleMove(index)}
            style={{ 
              height: '60px', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', fontWeight: 'bold', cursor: (!cell && !winner) ? 'pointer' : 'default', borderRadius: '4px',
              color: cell === 'X' ? '#ef4444' : '#3b82f6', transition: 'background 0.2s'
            }}
          >
            {cell}
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', fontSize: '0.9rem', fontWeight: '600', color: winner ? (winner === 'draw' ? 'var(--warning)' : 'var(--primary)') : 'var(--text-secondary)' }}>
        {getStatusText()}
      </div>

      {winner && (
        <button onClick={resetGame} style={{ width: '100%', marginTop: '10px', background: 'var(--surface-hover)', padding: '8px', borderRadius: '6px', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
          Tekrar Oyna
        </button>
      )}
    </div>
  );
}
