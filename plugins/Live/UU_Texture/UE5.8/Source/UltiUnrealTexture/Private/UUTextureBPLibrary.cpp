// Copyright 2026 Julien Darras. All Rights Reserved.

#include "UUTextureBPLibrary.h"

#include "UltiUnrealTexture.h"

#include "Components/MeshComponent.h"
#include "Engine/Texture2D.h"
#include "IImageWrapper.h"
#include "IImageWrapperModule.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "Modules/ModuleManager.h"
#include "UUMediaTextureTarget.h"
#include "TextureResource.h"

namespace
{
	static bool UU_IsHex(TCHAR C)
	{
		return (C >= '0' && C <= '9') || (C >= 'A' && C <= 'F') || (C >= 'a' && C <= 'f');
	}

	static uint8 UU_HexVal(TCHAR C)
	{
		if (C >= '0' && C <= '9') return uint8(C - '0');
		if (C >= 'A' && C <= 'F') return uint8(C - 'A' + 10);
		return uint8(C - 'a' + 10);
	}

	// Minimal %XX decoder (enough for file://...%20...)
	static FString UU_UrlDecode(const FString& In)
	{
		FString Out;
		Out.Reserve(In.Len());

		for (int32 i = 0; i < In.Len(); ++i)
		{
			const TCHAR C = In[i];
			if (C == '%' && i + 2 < In.Len() && UU_IsHex(In[i + 1]) && UU_IsHex(In[i + 2]))
			{
				const uint8 Hi = UU_HexVal(In[i + 1]);
				const uint8 Lo = UU_HexVal(In[i + 2]);
				const uint8 Byte = uint8((Hi << 4) | Lo);
				Out.AppendChar(TCHAR(Byte));
				i += 2;
			}
			else
			{
				Out.AppendChar(C);
			}
		}
		return Out;
	}

	// Support:
	// - D:\folder\img.png
	// - D:/folder/img.png
	// - file:///D:/folder/img.png
	// - "file:///D:/folder/img.png" (avec guillemets)
	static FString UU_NormalizeFileUrlToPath(const FString& InFileUrl)
	{
		FString S = InFileUrl;
		S.TrimStartAndEndInline();

		if (S.IsEmpty())
		{
			return FString();
		}

		// Remove wrapping quotes
		if (S.Len() >= 2)
		{
			const TCHAR First = S[0];
			const TCHAR LastCh = S[S.Len() - 1];
			if ((First == '"' && LastCh == '"') || (First == '\'' && LastCh == '\''))
			{
				S = S.Mid(1, S.Len() - 2);
				S.TrimStartAndEndInline();
			}
		}

		// Normalize slashes early
		S.ReplaceInline(TEXT("\\"), TEXT("/"));

		// Decode %XX
		S = UU_UrlDecode(S);

		// Reject http(s)
		if (S.StartsWith(TEXT("http://"), ESearchCase::IgnoreCase) || S.StartsWith(TEXT("https://"), ESearchCase::IgnoreCase))
		{
			UE_LOG(LogUltiUnrealTexture, Warning, TEXT("UU_NormalizeFileUrlToPath: http(s) not supported: %s"), *InFileUrl);
			return FString();
		}

		// Handle file://
		if (S.StartsWith(TEXT("file://"), ESearchCase::IgnoreCase))
		{
			S.RightChopInline(7); // remove "file://"

			// Windows: file:///D:/... -> "/D:/..." then strip first '/'
			if (S.StartsWith(TEXT("/")) && S.Len() >= 3 && FChar::IsAlpha(S[1]) && S[2] == ':')
			{
				S.RightChopInline(1);
			}
		}

		// Convert relative -> absolute
		if (FPaths::IsRelative(S))
		{
			S = FPaths::ConvertRelativePathToFull(S);
		}

		FPaths::NormalizeFilename(S);
		return S;
	}

	static bool UU_LoadTextureFromDisk(const FString& FullPath, UTexture2D*& OutTexture)
	{
		OutTexture = nullptr;

		if (FullPath.IsEmpty())
		{
			UE_LOG(LogUltiUnrealTexture, Warning, TEXT("UU_LoadTextureFromDisk: empty path"));
			return false;
		}

		if (!FPaths::FileExists(FullPath))
		{
			UE_LOG(LogUltiUnrealTexture, Warning, TEXT("UU_LoadTextureFromDisk: file not found: %s"), *FullPath);
			return false;
		}

		TArray<uint8> FileData;
		if (!FFileHelper::LoadFileToArray(FileData, *FullPath))
		{
			UE_LOG(LogUltiUnrealTexture, Warning, TEXT("UU_LoadTextureFromDisk: failed to read: %s"), *FullPath);
			return false;
		}

		IImageWrapperModule& ImageWrapperModule = FModuleManager::LoadModuleChecked<IImageWrapperModule>(FName("ImageWrapper"));
		const EImageFormat Format = ImageWrapperModule.DetectImageFormat(FileData.GetData(), FileData.Num());
		if (Format == EImageFormat::Invalid)
		{
			UE_LOG(LogUltiUnrealTexture, Warning, TEXT("UU_LoadTextureFromDisk: unsupported image format: %s"), *FullPath);
			return false;
		}

		TSharedPtr<IImageWrapper> Wrapper = ImageWrapperModule.CreateImageWrapper(Format);
		if (!Wrapper.IsValid() || !Wrapper->SetCompressed(FileData.GetData(), FileData.Num()))
		{
			UE_LOG(LogUltiUnrealTexture, Warning, TEXT("UU_LoadTextureFromDisk: image wrapper failed: %s"), *FullPath);
			return false;
		}

		const int32 Width = Wrapper->GetWidth();
		const int32 Height = Wrapper->GetHeight();

		TArray<uint8> RawData;
		if (!Wrapper->GetRaw(ERGBFormat::BGRA, 8, RawData))
		{
			UE_LOG(LogUltiUnrealTexture, Warning, TEXT("UU_LoadTextureFromDisk: GetRaw failed: %s"), *FullPath);
			return false;
		}

		UTexture2D* NewTexture = UTexture2D::CreateTransient(Width, Height, PF_B8G8R8A8);
		if (!NewTexture || !NewTexture->GetPlatformData() || NewTexture->GetPlatformData()->Mips.Num() == 0)
		{
			UE_LOG(LogUltiUnrealTexture, Warning, TEXT("UU_LoadTextureFromDisk: CreateTransient failed"));
			return false;
		}

		FTexture2DMipMap& Mip = NewTexture->GetPlatformData()->Mips[0];
		Mip.BulkData.Lock(LOCK_READ_WRITE);
		void* Data = Mip.BulkData.Realloc(RawData.Num());
		FMemory::Memcpy(Data, RawData.GetData(), RawData.Num());
		Mip.BulkData.Unlock();

		NewTexture->UpdateResource();
		OutTexture = NewTexture;

		return true;
	}

	static bool UU_ApplyTextureParam(UMeshComponent* Mesh, int32 MaterialIndex, FName TextureParameterName, UTexture2D* Texture)
	{
		if (!Mesh || !Texture)
		{
			return false;
		}

		const int32 NumMats = Mesh->GetNumMaterials();
		if (MaterialIndex < 0 || MaterialIndex >= NumMats)
		{
			UE_LOG(LogUltiUnrealTexture, Warning, TEXT("UU_ApplyTextureParam: invalid MaterialIndex=%d (Num=%d)"), MaterialIndex, NumMats);
			return false;
		}

		UMaterialInstanceDynamic* MID = Cast<UMaterialInstanceDynamic>(Mesh->GetMaterial(MaterialIndex));
		if (!MID)
		{
			MID = Mesh->CreateAndSetMaterialInstanceDynamic(MaterialIndex);
		}
		if (!MID)
		{
			UE_LOG(LogUltiUnrealTexture, Warning, TEXT("UU_ApplyTextureParam: failed to create MID (mat %d)"), MaterialIndex);
			return false;
		}

		MID->SetTextureParameterValue(TextureParameterName, Texture);
		return true;
	}
}

bool UUUTextureBPLibrary::UUSetTextureFromFileSimple2(UMeshComponent* Mesh, int32 MaterialIndex, FName TextureParameterName, const FString& FileUrl)
{
	if (!Mesh)
	{
		UE_LOG(LogUltiUnrealTexture, Warning, TEXT("UUSetTextureFromFileSimple2: Mesh is null"));
		return false;
	}

	if (TextureParameterName.IsNone())
	{
		UE_LOG(LogUltiUnrealTexture, Warning, TEXT("UUSetTextureFromFileSimple2: TextureParameterName is None"));
		return false;
	}

	const FString Path = UU_NormalizeFileUrlToPath(FileUrl);
	if (Path.IsEmpty())
	{
		UE_LOG(LogUltiUnrealTexture, Warning, TEXT("UUSetTextureFromFileSimple2: invalid FileUrl: %s"), *FileUrl);
		return false;
	}

	UTexture2D* Texture = nullptr;
	if (!UU_LoadTextureFromDisk(Path, Texture))
	{
		return false;
	}

	return UU_ApplyTextureParam(Mesh, MaterialIndex, TextureParameterName, Texture);
}

bool UUUTextureBPLibrary::UUSetMediaTextureFromFile(UMeshComponent* Mesh, int32 MaterialIndex, FName TextureParameterName, const FString& FileUrl)
{
	if (!Mesh) return false;

	AActor* Owner = Mesh->GetOwner();
	if (!Owner) return false;

	// Find or create the component
	UUMediaTextureTarget* Target = Owner->FindComponentByClass<UUMediaTextureTarget>();
	if (!Target)
	{
		Target = NewObject<UUMediaTextureTarget>(Owner, UUMediaTextureTarget::StaticClass(), NAME_None, RF_Transient);
		if (!Target) return false;

		Owner->AddInstanceComponent(Target);
		Target->RegisterComponent();
	}

	Target->SetTargetMesh(Mesh);
	Target->SetMaterialIndex(MaterialIndex);
	Target->SetTextureParameterName(TextureParameterName);

	return Target->SetMediaFromFile(FileUrl);
}