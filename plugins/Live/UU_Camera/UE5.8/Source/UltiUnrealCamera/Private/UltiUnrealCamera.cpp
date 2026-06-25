// Copyright (c) 2025 Julien Darras / JDarrasVP. All Rights Reserved.

#include "UltiUnrealCamera.h"

#define LOCTEXT_NAMESPACE "FUltiUnrealCameraModule"

void FUltiUnrealCameraModule::StartupModule()
{
	// This code will execute after your module is loaded into memory; the exact timing is specified in the .uplugin file per-module
}

void FUltiUnrealCameraModule::ShutdownModule()
{
	// This function may be called during shutdown to clean up your module.  For modules that support dynamic reloading,
	// we call this function before unloading the module.
}

#undef LOCTEXT_NAMESPACE
	
IMPLEMENT_MODULE(FUltiUnrealCameraModule, UltiUnrealCamera)