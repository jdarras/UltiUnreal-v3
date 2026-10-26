// Copyright 2025 Julien Darras. All Rights Reserved.

#include "UURenderResultSubsystem.h"

#include "Dom/JsonObject.h"
#include "HAL/FileManager.h"
#include "Misc/App.h"
#include "Misc/Base64.h"
#include "Misc/CommandLine.h"
#include "Misc/DateTime.h"
#include "Misc/EngineVersion.h"
#include "Misc/FileHelper.h"
#include "Misc/Parse.h"
#include "Misc/Paths.h"
#include "MoviePipelineBase.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonWriter.h"
#include "UObject/UObjectHash.h"

DEFINE_LOG_CATEGORY_STATIC(LogUURenderResult, Log, All);

namespace
{
    // Schéma lu par l'application (app/utils/renderResultManifest.js).
    constexpr int32 RenderResultSchemaVersion = 1;
    // 0 : à chaque image du moteur.
    constexpr float PipelineScanIntervalSeconds = 0.0f;
}

// Emplacement de la fiche : -UURenderResultFileB64= (chemin UTF-8 en base64,
// insensible aux espaces et guillemets, transmis par l'application) ou
// -UURenderResultFile= (forme simple, pour un essai manuel).
static FString ReadResultFilePathFromCommandLine()
{
    const TCHAR* Cmd = FCommandLine::Get();
    FString Encoded;
    if (FParse::Value(Cmd, TEXT("UURenderResultFileB64="), Encoded))
    {
        TArray<uint8> Bytes;
        if (FBase64::Decode(Encoded.TrimStartAndEnd(), Bytes) && Bytes.Num() > 0)
        {
            const FUTF8ToTCHAR Converted(reinterpret_cast<const ANSICHAR*>(Bytes.GetData()), Bytes.Num());
            return FString(Converted.Length(), Converted.Get()).TrimStartAndEnd();
        }
        return FString();
    }
    FString Plain;
    FParse::Value(Cmd, TEXT("UURenderResultFile="), Plain);
    return Plain.TrimStartAndEnd().TrimQuotes();
}

bool UURenderResultSubsystem::ShouldCreateSubsystem(UObject* Outer) const
{
    return !ReadResultFilePathFromCommandLine().IsEmpty();
}

void UURenderResultSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);

    const TCHAR* Cmd = FCommandLine::Get();
    ResultFilePath = ReadResultFilePathFromCommandLine();
    FParse::Value(Cmd, TEXT("UURenderResultJobId="), JobId);
    ResultFilePath = FPaths::ConvertRelativePathToFull(ResultFilePath);
    JobId = JobId.TrimStartAndEnd().TrimQuotes();

    // Une fiche laissée par une tentative précédente ne doit jamais passer
    // pour le résultat de celle-ci.
    IFileManager::Get().Delete(*ResultFilePath, false, true, true);

    TickerHandle = FTSTicker::GetCoreTicker().AddTicker(
        FTickerDelegate::CreateUObject(this, &UURenderResultSubsystem::BindNewPipelines),
        PipelineScanIntervalSeconds);

    UE_LOG(LogUURenderResult, Display, TEXT("Fiche de fin de rendu attendue : %s (rendu %s)"), *ResultFilePath, *JobId);
}

void UURenderResultSubsystem::Deinitialize()
{
    if (TickerHandle.IsValid())
    {
        FTSTicker::GetCoreTicker().RemoveTicker(TickerHandle);
        TickerHandle.Reset();
    }
    for (const TWeakObjectPtr<UMoviePipelineBase>& Pipeline : BoundPipelines)
    {
        if (Pipeline.IsValid())
        {
            Pipeline->OnMoviePipelineWorkFinished().RemoveAll(this);
        }
    }
    BoundPipelines.Reset();
    Super::Deinitialize();
}

// Le pipeline est créé par l'exécuteur Movie Render Queue après le chargement
// du niveau : on s'abonne à la fin de chaque nouveau pipeline dès qu'il existe.
bool UURenderResultSubsystem::BindNewPipelines(float DeltaTime)
{
    // Recherche par type (table des objets par classe, sans parcourir tous les
    // objets), à chaque image du moteur : un pipeline court ne peut pas finir
    // avant d'être suivi.
    ForEachObjectOfClass(UMoviePipelineBase::StaticClass(), [this](UObject* Object)
    {
        UMoviePipelineBase* Pipeline = Cast<UMoviePipelineBase>(Object);
        if (!Pipeline || Pipeline->HasAnyFlags(RF_ClassDefaultObject | RF_ArchetypeObject) || !IsValid(Pipeline))
        {
            return;
        }
        const bool bAlreadyBound = BoundPipelines.ContainsByPredicate(
            [Pipeline](const TWeakObjectPtr<UMoviePipelineBase>& Bound) { return Bound.Get() == Pipeline; });
        if (bAlreadyBound)
        {
            return;
        }
        Pipeline->OnMoviePipelineWorkFinished().AddUObject(this, &UURenderResultSubsystem::HandlePipelineWorkFinished);
        BoundPipelines.Add(Pipeline);
        UE_LOG(LogUURenderResult, Display, TEXT("Suivi du pipeline %s (image %llu)"), *Pipeline->GetName(), GFrameCounter);
    });
    return true;
}

void UURenderResultSubsystem::HandlePipelineWorkFinished(FMoviePipelineOutputData Results)
{
    FinishedPipelineCount += 1;
    bAllSucceeded = bAllSucceeded && Results.bSuccess;

    for (const FMoviePipelineShotOutputData& Shot : Results.ShotData)
    {
        for (const TPair<FMoviePipelinePassIdentifier, FMoviePipelineRenderPassOutputData>& Pass : Shot.RenderPassData)
        {
            for (const FString& FilePath : Pass.Value.FilePaths)
            {
                const FString FullPath = FPaths::ConvertRelativePathToFull(FilePath);
                if (!FullPath.IsEmpty())
                {
                    OutputFiles.AddUnique(FullPath);
                }
            }
        }
    }

    if (!WriteResultFile())
    {
        UE_LOG(LogUURenderResult, Error, TEXT("Impossible d'écrire la fiche de fin de rendu : %s"), *ResultFilePath);
    }
}

bool UURenderResultSubsystem::WriteResultFile() const
{
    TSharedRef<FJsonObject> Root = MakeShared<FJsonObject>();
    Root->SetNumberField(TEXT("schema"), RenderResultSchemaVersion);
    Root->SetStringField(TEXT("jobId"), JobId);
    Root->SetBoolField(TEXT("success"), bAllSucceeded);
    Root->SetNumberField(TEXT("pipelines"), FinishedPipelineCount);
    Root->SetStringField(TEXT("finishedAt"), FDateTime::UtcNow().ToIso8601());
    Root->SetStringField(TEXT("engineVersion"), FEngineVersion::Current().ToString(EVersionComponent::Patch));

    TArray<TSharedPtr<FJsonValue>> Files;
    for (const FString& File : OutputFiles)
    {
        Files.Add(MakeShared<FJsonValueString>(File));
    }
    Root->SetArrayField(TEXT("files"), Files);

    FString Json;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Json);
    if (!FJsonSerializer::Serialize(Root, Writer))
    {
        return false;
    }

    // Écriture complète dans un fichier temporaire, puis renommage : l'application
    // ne lit jamais une fiche à moitié écrite.
    const FString TempPath = ResultFilePath + TEXT(".tmp");
    IFileManager::Get().MakeDirectory(*FPaths::GetPath(ResultFilePath), true);
    if (!FFileHelper::SaveStringToFile(Json, *TempPath, FFileHelper::EEncodingOptions::ForceUTF8WithoutBOM))
    {
        return false;
    }
    return IFileManager::Get().Move(*ResultFilePath, *TempPath, true, true);
}
