// Copyright 2026 Julien Darras. All Rights Reserved.

using UnrealBuildTool;
using UnrealBuildTool.Rules;

public class UltiUnrealTexture : ModuleRules
{
    public UltiUnrealTexture(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(
            new string[]
            {
                "Core",
                "CoreUObject",
                "Engine",
                "Projects",
                "ImageWrapper",
                "RenderCore",
                "RHI",
                "MediaAssets",
                "MediaPlate",
                "AudioMixer",
                "HTTP",
                "InputCore",
            }
        );

        PrivateDependencyModuleNames.AddRange(
            new string[]
            {
            }
        );
    }
}
