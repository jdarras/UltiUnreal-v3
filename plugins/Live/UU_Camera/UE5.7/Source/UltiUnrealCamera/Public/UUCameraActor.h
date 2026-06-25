// Copyright (c) 2025 Julien Darras / JDarrasVP. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "CineCameraActor.h"
#include "UUCameraActor.generated.h"

class UCineCaptureComponent2D;
class UMaterialInterface;
class UTextureRenderTarget2D;

/**
 * Camera UltiUnreal :
 */
UCLASS()
class ULTIUNREALCAMERA_API AUUCameraActor : public ACineCameraActor
{
    GENERATED_BODY()

public:
    AUUCameraActor(const FObjectInitializer& ObjectInitializer);

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UltiUnreal")
    bool bUseStencilAsAlpha = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UltiUnreal")
    UMaterialInterface* StencilToAlphaMaterial = nullptr;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "UltiUnreal")
    bool bInvertAlpha = false;
        
    UFUNCTION(BlueprintCallable, Category = "UltiUnreal")
    void SetTextureTarget(UTextureRenderTarget2D* NewTarget);

protected:
    virtual void BeginPlay() override;
    virtual void Tick(float DeltaSeconds) override;

private:
    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "UltiUnreal", meta = (AllowPrivateAccess = "true"))
    UCineCaptureComponent2D* CaptureComponent;
        
    UTextureRenderTarget2D* CurrentTextureTarget = nullptr;

    UPROPERTY(Transient)
    class UMaterialInstanceDynamic* StencilToAlphaMID = nullptr;
        
    void EnsureCaptureSetup();

    void UpdatePostProcessForAlpha();
};
