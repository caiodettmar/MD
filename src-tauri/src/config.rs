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
    #[serde(default)]
    pub recent_files: Vec<String>,
    #[serde(default = "default_true")]
    pub show_edit_references: bool,
    #[serde(default = "default_true")]
    pub use_max_width: bool,
    #[serde(default = "default_max_width_preset")]
    pub max_width_preset: String,
    #[serde(default = "default_max_width_custom_value")]
    pub max_width_custom_value: u32,
    #[serde(default = "default_max_width_custom_unit")]
    pub max_width_custom_unit: String,
}

fn default_true() -> bool {
    true
}

fn default_max_width_preset() -> String {
    "Default".to_string()
}

fn default_max_width_custom_value() -> u32 {
    720
}

fn default_max_width_custom_unit() -> String {
    "px".to_string()
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
            recent_files: Vec::new(),
            show_edit_references: true,
            use_max_width: true,
            max_width_preset: "Default".to_string(),
            max_width_custom_value: 720,
            max_width_custom_unit: "px".to_string(),
        }
    }
}
