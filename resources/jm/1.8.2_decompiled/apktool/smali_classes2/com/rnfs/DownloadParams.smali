.class public Lcom/rnfs/DownloadParams;
.super Ljava/lang/Object;
.source "DownloadParams.java"


# annotations
.annotation system Ldalvik/annotation/MemberClasses;
    value = {
        Lcom/rnfs/DownloadParams$OnDownloadProgress;,
        Lcom/rnfs/DownloadParams$OnDownloadBegin;,
        Lcom/rnfs/DownloadParams$OnTaskCompleted;
    }
.end annotation


# instance fields
.field public connectionTimeout:I

.field public dest:Ljava/io/File;

.field public headers:Lcom/facebook/react/bridge/ReadableMap;

.field public onDownloadBegin:Lcom/rnfs/DownloadParams$OnDownloadBegin;

.field public onDownloadProgress:Lcom/rnfs/DownloadParams$OnDownloadProgress;

.field public onTaskCompleted:Lcom/rnfs/DownloadParams$OnTaskCompleted;

.field public progressDivider:F

.field public progressInterval:I

.field public readTimeout:I

.field public src:Ljava/net/URL;


# direct methods
.method public constructor <init>()V
    .locals 0

    .line 9
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method
