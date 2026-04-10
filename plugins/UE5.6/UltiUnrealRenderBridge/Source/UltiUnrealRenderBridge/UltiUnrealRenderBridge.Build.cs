// Copyright 2025 Julien Darras. All Rights Reserved.

using UnrealBuildTool;

public class UltiUnrealRenderBridge : ModuleRules
{
    public UltiUnrealRenderBridge(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = ModuleRules.PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(
            new string[]
            {
                "Core"
            }
        );

        PrivateDependencyModuleNames.AddRange(
            new string[]
            {
                "CoreUObject",
                "Engine",
                "HTTP",
                "Json",
                "JsonUtilities",
                "Projects"
            }
        );
    }
}
