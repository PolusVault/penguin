mod utils;

use hieu_chess::{Capture, Chess, Piece, Square};
use serde::{Deserialize, Serialize};
use std::convert::TryInto;
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize)]
pub struct Move {
    pub from: String,
    pub to: String,
    pub promotion_piece: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct Captures {
    pub w: Vec<Capture>,
    pub b: Vec<Capture>,
}

#[wasm_bindgen]
pub struct ChessWasm {
    chess: Chess,
}

#[wasm_bindgen]
impl ChessWasm {
    pub fn new() -> Self {
        Self {
            chess: Chess::new(),
        }
    }

    pub fn board(&self) -> *const Option<Piece> {
        self.chess.get_board_ptr()
    }

    pub fn play_move(&mut self, m: JsValue) -> Result<(), JsError> {
        let player_move: Move = serde_wasm_bindgen::from_value(m).unwrap();

        let promotion_piece: Option<Piece> = match player_move.promotion_piece {
            Some(p) => Some(p.as_str().try_into()?),
            None => None,
        };

        match self.chess.play_move(hieu_chess::Move::from_str(
            &player_move.from,
            &player_move.to,
            promotion_piece,
        )) {
            Ok(_) => Ok(()),
            Err(e) => Err(JsError::new(&e.to_string())),
        }
    }

    pub fn moves_for_square(&mut self, sq_str: String) -> Result<JsValue, JsError> {
        let square: Square = match sq_str.as_str().try_into() {
            Ok(sq) => sq,
            Err(e) => return Err(JsError::new(&e.to_string())),
        };

        let moves: Vec<Move> = self
            .chess
            .moves_for_square(square)
            .iter()
            .map(|m| Move {
                from: m.from.get_notation(),
                to: m.to.get_notation(),
                promotion_piece: match &m.promotion_piece {
                    Some(p) => Some(p.clone().into()),
                    None => None,
                },
            })
            .collect();

        Ok(serde_wasm_bindgen::to_value(&moves)?)
    }

    pub fn get_captures(&self) -> Result<JsValue, JsError> {
        let _captures = self.chess.get_captures();

        let captures = Captures {
            w: _captures.0,
            b: _captures.1,
        };

        Ok(serde_wasm_bindgen::to_value(&captures)?)
    }

    pub fn reset(&mut self) {
        self.chess.reset();
    }

    pub fn is_checkmate(&mut self) -> bool {
        self.chess.is_checkmate()
    }

    pub fn is_draw(&mut self) -> bool {
        self.chess.is_draw()
    }

    pub fn is_stalemate(&mut self) -> bool {
        self.chess.is_stalemate()
    }

    pub fn is_insufficient_materials(&mut self) -> bool {
        self.chess.is_insufficient_material()
    }

    pub fn is_threefold_repetition(&mut self) -> bool {
        self.chess.is_threefold_repetition()
    }

    pub fn load_fen(&mut self, fen: String) -> Result<(), JsError> {
        match self.chess.load_fen(&fen) {
            Ok(_) => Ok(()),
            Err(_) => Err(JsError::new("Failed to load FEN")),
        }
    }

    pub fn get_fen(&self) -> String {
        self.chess.get_fen()
    }

    pub fn turn(&self) -> String {
        let color: &str = self.chess.get_turn().into();
        color.to_string()
    }

    pub fn set_turn(&mut self, turn: &str) -> Result<(), JsError> {
        Ok(self.chess.set_turn(turn.try_into()?))
    }
}
