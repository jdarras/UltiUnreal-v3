# Compiler UltiUnrealRenderBridge

Les fichiers compilés (`UE5.x/Binaries/Win64`) sont enregistrés dans le dépôt :
après toute modification du code C++, recompiler les trois versions et
remplacer `UnrealEditor-UltiUnrealRenderBridge.dll` et `.pdb`.
`UnrealEditor.modules` ne change pas tant que le moteur n'est pas mis à jour.

Le code source est identique dans `UE5.6`, `UE5.7` et `UE5.8`.

## Unreal 5.7 et 5.8

```powershell
& "D:\Epic\UE_5.7\Engine\Build\BatchFiles\RunUAT.bat" BuildPlugin `
  -Plugin="D:\UltiUnreal\plugins\Rendu\UltiUnrealRenderBridge\UE5.7\UltiUnrealRenderBridge.uplugin" `
  -Package="$env:TEMP\uu-plugin-build\UE5.7" -TargetPlatforms=Win64
```

Résultat : `$env:TEMP\uu-plugin-build\UE5.7\Binaries\Win64`.
`BuildPlugin` crée un `Config/FilterPlugin.ini` dans le dossier source : le supprimer.

## Unreal 5.6

`BuildPlugin` échoue (`ArgumentNullException` dans `ModuleRules.IsValidForTarget`)
sur ce poste. La cible éditeur standard d'Unreal 5.6 recense tous les modules du
moteur, et plusieurs plugins ajoutés au moteur après son installation (NVIDIA
DLSS, NIS, Streamline, DirectExcel) n'ont pas de règles précompilées. L'outil
5.6 plante sur eux, alors que 5.7 les ignore.

Contournement, sans toucher au moteur :

1. Lancer la commande `BuildPlugin` ci-dessus pour 5.6 : elle échoue, mais
   prépare le projet hôte `$env:TEMP\uu-plugin-build\UE5.6\HostProject`.
2. Créer `HostProject\Source\HostProjectEditor.Target.cs` :

   ```csharp
   using UnrealBuildTool;

   public class HostProjectEditorTarget : TargetRules
   {
       public HostProjectEditorTarget(TargetInfo Target) : base(Target)
       {
           Type = TargetType.Editor;
           IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
           BuildEnvironment = TargetBuildEnvironment.Shared;
           DefaultBuildSettings = BuildSettingsVersion.Latest;
           bBuildAllModules = false;
       }
   }
   ```

3. Compiler cette cible :

   ```powershell
   $hp = "$env:TEMP\uu-plugin-build\UE5.6\HostProject"
   & "D:\Epic\UE_5.6\Engine\Binaries\ThirdParty\DotNet\8.0.300\win-x64\dotnet.exe" `
     "D:\Epic\UE_5.6\Engine\Binaries\DotNET\UnrealBuildTool\UnrealBuildTool.dll" `
     HostProjectEditor Win64 Development "-Project=$hp\HostProject.uproject" -noubtmakefiles -nohotreload
   ```

Résultat : `HostProject\Plugins\UltiUnrealRenderBridge\Binaries\Win64`.
Vérifier que le `BuildId` de `UnrealEditor.modules` est celui du dépôt.

## Essai réel

Un rendu Movie Render Queue en ligne de commande, avec
`-UURenderResultFileB64=<chemin UTF-8 en base64>` et `-UURenderResultJobId=<id>`,
doit écrire la fiche JSON, avec `success`, `jobId` et `files`. Le journal Unreal
affiche `LogUURenderResult: Suivi du pipeline … (image 2)` dès le début du rendu.
