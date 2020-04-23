import { RosettaVersion, RosettaAllow } from "./rosetta";
import { BlockIdentifier } from "./block";

export class NetworkIdentifier{
    public blockchain:String = "";
    public network:String = "";
    public sub_network_identifier:SubNetworkIdentifier | any;

}

export class SubNetworkIdentifier{
    public network:String = "";
    public metadata:any | undefined;
}

export class NetworkOptionsResponse{
    public version:RosettaVersion = new RosettaVersion();
    public allow:RosettaAllow = new RosettaAllow();
}


export class NetworkStatusResponse{
    public current_block_identifier:BlockIdentifier = new BlockIdentifier();
    public current_block_timestamp:number = 0;
    public genesis_block_identifier:BlockIdentifier = new BlockIdentifier();
    public peers:Array<Peer> = new Array<Peer>();
}

export class Peer{
    public peer_id:String = "";
    public metadata:any | undefined;
}
