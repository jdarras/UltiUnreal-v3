!include "LogicLib.nsh"
!include "nsDialogs.nsh"

!ifndef LANG_ENGLISH
  !define LANG_ENGLISH 1033
!endif
!ifndef LANG_FRENCH
  !define LANG_FRENCH 1036
!endif

!ifndef BUILD_UNINSTALLER
  Var DesktopShortcutCheckbox
  Var DesktopShortcutSelected

  !define MUI_LICENSEPAGE_TEXT_TOP ""

  LangString DesktopShortcutLabel ${LANG_ENGLISH} "Create a desktop shortcut"
  LangString DesktopShortcutLabel ${LANG_FRENCH} "Creer un raccourci bureau"

  !macro customInit
    StrCpy $DesktopShortcutSelected 1
    ${If} ${isNoDesktopShortcut}
      StrCpy $DesktopShortcutSelected 0
    ${EndIf}
  !macroend

  !macro customPageAfterChangeDir
    Page Custom DesktopShortcutPageCreate DesktopShortcutPageLeave
  !macroend

  Function DesktopShortcutPageCreate
    nsDialogs::Create 1018
    Pop $0
    ${If} $0 == error
      Abort
    ${EndIf}

    ${NSD_CreateCheckbox} 0 0 100% 12u "$(DesktopShortcutLabel)"
    Pop $DesktopShortcutCheckbox

    ${If} $DesktopShortcutSelected == 1
      ${NSD_Check} $DesktopShortcutCheckbox
    ${EndIf}

    nsDialogs::Show
  FunctionEnd

  Function DesktopShortcutPageLeave
    ${NSD_GetState} $DesktopShortcutCheckbox $0
    StrCpy $DesktopShortcutSelected $0
  FunctionEnd

  !macro customInstall
    ${If} $installMode == "all"
      SetShellVarContext all
    ${Else}
      SetShellVarContext current
    ${EndIf}

    StrCpy $0 "$DESKTOP\${SHORTCUT_NAME}.lnk"

    ${If} $DesktopShortcutSelected == 1
      CreateShortCut "$0" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
      ClearErrors
      WinShell::SetLnkAUMI "$0" "${APP_ID}"
      System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
    ${Else}
      ${if} ${FileExists} "$0"
        WinShell::UninstShortcut "$0"
        Delete "$0"
      ${endIf}
    ${EndIf}
  !macroend
!endif
