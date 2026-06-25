// Copyright (c) 2025 Julien Darras / JDarrasVP. All Rights Reserved.

#include "UUCameraActor.h"

#include "CineCameraComponent.h"
#include "CineCameraSceneCaptureComponent.h"
#include "Engine/World.h"
#include "Engine/Scene.h"                  
#include "Engine/TextureRenderTarget2D.h"
#include "UObject/ConstructorHelpers.h"
#include "Materials/MaterialInstanceDynamic.h"

AUUCameraActor::AUUCameraActor(const FObjectInitializer& ObjectInitializer)
    : Super(ObjectInitializer)
{
    PrimaryActorTick.bCanEverTick = true;

    UCineCameraComponent* CineComp = GetCineCameraComponent();

    CaptureComponent = CreateDefaultSubobject<UCineCaptureComponent2D>(TEXT("UU_CineCapture"));

    if (CineComp)
    {
        CaptureComponent->SetupAttachment(CineComp);
        CaptureComponent->CineCameraComponent = CineComp;
        CaptureComponent->SetRelativeTransform(FTransform::Identity);
    }
    else
    {
        CaptureComponent->SetupAttachment(GetRootComponent());
    }

    CaptureComponent->bCaptureEveryFrame = true;
    CaptureComponent->bCaptureOnMovement = false;

    CaptureComponent->CaptureSource = ESceneCaptureSource::SCS_FinalColorHDR;

    CaptureComponent->PrimitiveRenderMode = ESceneCapturePrimitiveRenderMode::PRM_RenderScenePrimitives;

    CaptureComponent->bFollowSceneCaptureRenderPath = false;

    if (!StencilToAlphaMaterial)
    {
        static ConstructorHelpers::FObjectFinder<UMaterialInterface> DefaultStencilMat(
            TEXT("Material'/UltiUnrealCameraContent/Materials/M_UU_StencilToAlpha.M_UU_StencilToAlpha'")
        );

        if (DefaultStencilMat.Succeeded())
        {
            StencilToAlphaMaterial = DefaultStencilMat.Object;
        }
        else
        {
            UE_LOG(LogTemp, Warning,
                TEXT("UUCameraActor: Unable to load the default material M_UU_StencilToAlpha from the plugin."));
        }
    }
}

void AUUCameraActor::BeginPlay()
{
    Super::BeginPlay();

    UE_LOG(LogTemp, Log, TEXT("UUCameraActor::BeginPlay - %s"), *GetName());

    EnsureCaptureSetup();
    UpdatePostProcessForAlpha();
}

void AUUCameraActor::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);

    EnsureCaptureSetup();
    UpdatePostProcessForAlpha();
}

void AUUCameraActor::EnsureCaptureSetup()
{
    if (!CaptureComponent)
    {
        return;
    }

    if (UCineCameraComponent* CineComp = GetCineCameraComponent())
    {
        if (CaptureComponent->GetAttachParent() != CineComp)
        {
            CaptureComponent->AttachToComponent(
                CineComp,
                FAttachmentTransformRules::KeepRelativeTransform
            );
        }

        CaptureComponent->CineCameraComponent = CineComp;
    }
}

void AUUCameraActor::UpdatePostProcessForAlpha()
{
    UCineCameraComponent* CineComp = GetCineCameraComponent();
    if (!CineComp)
    {
        return;
    }

    auto& Blendables = CineComp->PostProcessSettings.WeightedBlendables.Array;

    Blendables.RemoveAll([this](const FWeightedBlendable& WB)
        {
            return WB.Object == StencilToAlphaMaterial || WB.Object == StencilToAlphaMID;
        });

    if (!bUseStencilAsAlpha)
    {
        return;
    }

    if (!StencilToAlphaMaterial)
    {
        UE_LOG(LogTemp, Warning,
            TEXT("UUCameraActor %s: bUseStencilAsAlpha is actif but no StencilToAlphaMaterial is assigned."),
            *GetName());
        return;
    }

    if (!StencilToAlphaMID)
    {
        StencilToAlphaMID = UMaterialInstanceDynamic::Create(StencilToAlphaMaterial, this);
        if (!StencilToAlphaMID)
        {
            UE_LOG(LogTemp, Warning,
                TEXT("UUCameraActor %s: impossible to create MID for StencilToAlphaMaterial."),
                *GetName());
            return;
        }
    }

    StencilToAlphaMID->SetScalarParameterValue(TEXT("InvertAlpha"), bInvertAlpha ? 1.0f : 0.0f);

    Blendables.Add(FWeightedBlendable(1.0f, StencilToAlphaMID));
}

void AUUCameraActor::SetTextureTarget(UTextureRenderTarget2D* NewTarget)
{
    CurrentTextureTarget = NewTarget;

    if (CaptureComponent)
    {
        CaptureComponent->TextureTarget = NewTarget;
    }

    if (NewTarget)
    {
        UE_LOG(LogTemp, Log,
            TEXT("UUCameraActor::SetTextureTarget - New RenderTarget '%s' (%dx%d)"),
            *NewTarget->GetName(),
            NewTarget->SizeX,
            NewTarget->SizeY);
    }
    else
    {
        UE_LOG(LogTemp, Log,
            TEXT("UUCameraActor::SetTextureTarget - TextureTarget reset to null"));
    }
}