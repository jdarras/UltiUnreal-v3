// Copyright (c) 2025 Julien Darras / JDarrasVP. All Rights Reserved.

#pragma once

#include "Modules/ModuleManager.h"

class FUltiUnrealCameraModule : public IModuleInterface
{
public:

	/** IModuleInterface implementation */
	virtual void StartupModule() override;
	virtual void ShutdownModule() override;
};
