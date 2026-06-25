// Copyright 2026 Julien Darras. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "UUTextureBPLibrary.generated.h"

class UMeshComponent;

UCLASS()
class ULTIUNREALTEXTURE_API UUUTextureBPLibrary : public UBlueprintFunctionLibrary
{
	GENERATED_BODY()

public:
	UFUNCTION(BlueprintCallable, Category = "UltiUnrealTexture|Texture", meta = (DisplayName = "UU Set Texture From File (Simple)"))
	static bool UUSetTextureFromFileSimple2(UMeshComponent* Mesh, int32 MaterialIndex, FName TextureParameterName, const FString& FileUrl);

	UFUNCTION(BlueprintCallable, Category = "UltiUnrealTexture|Media", meta = (DisplayName = "UU Set Media Texture From File"))
	static bool UUSetMediaTextureFromFile(UMeshComponent* Mesh, int32 MaterialIndex, FName TextureParameterName, const FString& FileUrl);
};
