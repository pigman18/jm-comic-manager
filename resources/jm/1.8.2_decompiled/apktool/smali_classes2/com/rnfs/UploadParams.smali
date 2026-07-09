.class public Lcom/rnfs/UploadParams;
.super Ljava/lang/Object;
.source "UploadParams.java"


# annotations
.annotation system Ldalvik/annotation/MemberClasses;
    value = {
        Lcom/rnfs/UploadParams$onUploadBegin;,
        Lcom/rnfs/UploadParams$onUploadProgress;,
        Lcom/rnfs/UploadParams$onUploadComplete;
    }
.end annotation


# instance fields
.field public binaryStreamOnly:Z

.field public fields:Lcom/facebook/react/bridge/ReadableMap;

.field public files:Ljava/util/ArrayList;
    .annotation system Ldalvik/annotation/Signature;
        value = {
            "Ljava/util/ArrayList<",
            "Lcom/facebook/react/bridge/ReadableMap;",
            ">;"
        }
    .end annotation
.end field

.field public headers:Lcom/facebook/react/bridge/ReadableMap;

.field public method:Ljava/lang/String;

.field public name:Ljava/lang/String;

.field public onUploadBegin:Lcom/rnfs/UploadParams$onUploadBegin;

.field public onUploadComplete:Lcom/rnfs/UploadParams$onUploadComplete;

.field public onUploadProgress:Lcom/rnfs/UploadParams$onUploadProgress;

.field public src:Ljava/net/URL;


# direct methods
.method public constructor <init>()V
    .locals 0

    .line 8
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method
