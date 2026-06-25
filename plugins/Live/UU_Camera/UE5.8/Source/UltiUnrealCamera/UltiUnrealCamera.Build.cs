// Copyright (c) 2025 Julien Darras / JDarrasVP. All Rights Reserved.

using UnrealBuildTool;

public class UltiUnrealCamera : ModuleRules
{
    public UltiUnrealCamera(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(
            new string[]
            {
                "Core",
                "CoreUObject",
                "Engine",
                "RenderCore",
                "RHI",
                "CinematicCamera",
                "CineCameraSceneCapture"
            });

        PrivateDependencyModuleNames.AddRange(new string[] { });
    }
}