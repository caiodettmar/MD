use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub restore_session: bool,
    pub theme: ThemeMode,
    pub font_size: u32,
    pub word_wrap: bool,
    pub editor_zoom: u32,
    pub emoji_save_mode: EmojiSaveMode,
    pub show_raw_on_startup: bool,
    pub auto_save_ms: u32,
    pub check_updates: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ThemeMode {
    System,
    Light,
    Dark,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EmojiSaveMode {
    Unicode,
    Shortcode,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            restore_session: true,
            theme: ThemeMode::System,
            font_size: 100,
            word_wrap: true,
            editor_zoom: 100,
            emoji_save_mode: EmojiSaveMode::Unicode,
            show_raw_on_startup: false,
            auto_save_ms: 2000,
            check_updates: true,
        }
    }
}
