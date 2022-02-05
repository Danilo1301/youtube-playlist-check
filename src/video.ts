export default interface Video {
    id: string
    title: string;
    channelName: string;
    channelUrl: string;
    addedAt: number;
    removedAt: number;
    removed: boolean;
    count: number;
}