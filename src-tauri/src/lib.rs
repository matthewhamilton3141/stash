use std::sync::atomic::{AtomicU32, Ordering};
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, PhysicalPosition, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};
use tauri_plugin_global_shortcut::{
    Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState,
};
use tauri_plugin_window_state::StateFlags;

/// Show the quick-capture window if hidden, hide it if already visible.
fn toggle_capture(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("capture") {
        if win.is_visible().unwrap_or(false) {
            let _ = win.hide();
        } else {
            // No re-centering — keep wherever the user last positioned it.
            let _ = win.show();
            let _ = win.set_focus();
        }
    }
}

static CAPTURE_WINDOW_COUNTER: AtomicU32 = AtomicU32::new(0);

/// Open a brand-new, independent quick-capture window (⌘⇧N). Unlike the
/// singleton "capture" window this is never reused — it closes for good
/// when dismissed or saved (see `hide()` in Capture.tsx).
fn new_capture_window(app: &AppHandle) {
    let n = CAPTURE_WINDOW_COUNTER.fetch_add(1, Ordering::Relaxed);
    let label = format!("capture-{n}");
    let build = WebviewWindowBuilder::new(app, &label, WebviewUrl::App("index.html".into()))
        .title("Quick Capture")
        .inner_size(640.0, 420.0)
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .center()
        .build();
    if let Ok(win) = build {
        // Cascade so repeated presses don't stack windows exactly on top of each other.
        if n > 0 {
            if let Ok(pos) = win.outer_position() {
                let offset = (n % 8) as i32 * 24;
                let _ = win.set_position(PhysicalPosition::new(pos.x + offset, pos.y + offset));
            }
        }
        let _ = win.set_focus();
    }
}

fn show_main(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(StateFlags::POSITION | StateFlags::SIZE)
                .build(),
        )
        .setup(|app| {
            // Menu-bar–centric: no Dock/taskbar icon; the app lives in the tray.
            // Dismissing the capture window returns focus to the previous app.
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            // Menu-bar tray with quick actions.
            let open_i = MenuItem::with_id(app, "open", "Open Stash", true, None::<&str>)?;
            let capture_i =
                MenuItem::with_id(app, "capture", "Quick Capture", true, Some("Cmd+Shift+K"))?;
            let update_i =
                MenuItem::with_id(app, "update", "Check for Updates…", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open_i, &capture_i, &update_i, &quit_i])?;
            // Dedicated monochrome template glyph for the macOS menu bar.
            let tray_icon = Image::from_bytes(include_bytes!("../icons/tray-icon.png"))?;
            TrayIconBuilder::new()
                .icon(tray_icon)
                .icon_as_template(true)
                .tooltip("Stash")
                .menu(&menu)
                // Left-click the menu-bar icon → open Quick Capture instantly.
                // (The menu stays available on right-click.)
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_capture(tray.app_handle());
                    }
                })
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => show_main(app),
                    "capture" => toggle_capture(app),
                    "update" => {
                        show_main(app);
                        let _ = app.emit("update:check", ());
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            // Keep the main window alive when closed (hide, don't destroy) so it
            // can be reopened from the tray / capture with its state intact.
            if let Some(main) = app.get_webview_window("main") {
                let main_for_event = main.clone();
                main.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = main_for_event.hide();
                    }
                });
            }

            // Global quick-capture hotkey: Cmd/Ctrl + Shift + K.
            let hotkey = Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyK);
            app.global_shortcut()
                .on_shortcut(hotkey, move |app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        toggle_capture(app);
                    }
                })?;

            // Global new-capture-window hotkey: Cmd/Ctrl + Shift + N.
            let new_window_hotkey = Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::KeyN);
            app.global_shortcut()
                .on_shortcut(new_window_hotkey, move |app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        new_capture_window(app);
                    }
                })?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
