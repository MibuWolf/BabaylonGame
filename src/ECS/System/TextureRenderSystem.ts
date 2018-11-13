import { ListIteratingSystem } from '../../ash';
import { TextureNode } from '../Nodes/TextureNode';
import { SceneManager } from '../../Manager/SceneManager';
import 'babylonjs-loaders';
import { AbstractMesh, PBRMetallicRoughnessMaterial, Texture, Scene } from 'babylonjs';
import { TextureData } from '../VO/TextureData';

export class TextureRenderSystem extends ListIteratingSystem<TextureNode>
{
    constructor()
    {
        super( TextureNode );
    }

    protected nodeAdded = ( node: TextureNode ): void =>
    {
        var scene = SceneManager.GetInstance().GetScene();

        if ( scene == null )
        {
            console.log( "SceneManaer is Not init!" );
            return;
        }

        this.updateTexture( node );
    }

    public nodeRemoved = ( node: TextureNode ): void =>
    {
        if ( node.mesh.mesh != null )
        {
            let subMeshCount = node.mesh.mesh.subMeshes.length;

            for ( let index = 0; index < subMeshCount; index++ )
            {
                let subMesh = node.mesh.mesh.subMeshes[ index ];

                if ( subMesh == null || subMesh.getMesh() == null )
                    continue;

                let mesh = subMesh.getMesh();

                if ( mesh == null )
                    continue;

                let pbrMaterial: PBRMetallicRoughnessMaterial = <PBRMetallicRoughnessMaterial> mesh.material;
                if ( pbrMaterial.baseTexture != null )
                    pbrMaterial.baseTexture.dispose();

                if ( pbrMaterial.normalTexture != null )
                    pbrMaterial.normalTexture.dispose();

                if ( pbrMaterial.metallicRoughnessTexture != null )
                    pbrMaterial.metallicRoughnessTexture.dispose();

                if ( pbrMaterial.environmentTexture != null )
                    pbrMaterial.environmentTexture.dispose();

                let texData = node.texture.GetTextureData( mesh.name );

                if ( texData != null && texData.colorIDTex != null )
                {
                    texData.colorIDTex.dispose();
                    texData.colorIDTex = null;
                }
            }
        }
    }
    public updateNode( node: TextureNode, delta: number ): void
    {
        this.updateTexture( node );
    }


    public updateTexture( node: TextureNode ): void
    {
        if ( node.mesh.mesh != null && node.texture.needUpdate )
        {
            let subMeshCount = node.mesh.mesh.subMeshes.length;

            for ( let index = 0; index < subMeshCount; index++ )
            {
                let subMesh = node.mesh.mesh.subMeshes[ index ];

                if ( subMesh == null || subMesh.getMesh() == null )
                    continue;

                let mesh = subMesh.getMesh();
                let texData = node.texture.GetTextureData( mesh.name );

                this.updateMaterial( mesh, texData );
            }
        }
    }


    private updateMaterial( mesh: AbstractMesh, texData: TextureData ): void
    {
        if ( mesh == null || texData == null || !texData.needUpdate )
            return;

        texData.needUpdate = false;
        let pbrMaterial: PBRMetallicRoughnessMaterial = <PBRMetallicRoughnessMaterial> mesh.material;
        let scene: Scene = SceneManager.GetInstance().GetScene();

        if ( pbrMaterial == null )
            pbrMaterial = new PBRMetallicRoughnessMaterial( "pbr", scene );


        if ( pbrMaterial.baseTexture != null )
            pbrMaterial.baseTexture.dispose();

        if ( texData.baseTexPath != null && texData.baseTexPath != "" )
            pbrMaterial.baseTexture = new Texture( texData.baseTexPath, scene );

        if ( pbrMaterial.normalTexture != null )
            pbrMaterial.normalTexture.dispose();

        if ( texData.normalTexPath != null && texData.normalTexPath != "" )
            pbrMaterial.normalTexture = new Texture( texData.normalTexPath, scene );

        if ( pbrMaterial.metallicRoughnessTexture != null )
            pbrMaterial.metallicRoughnessTexture.dispose();

        if ( texData.metroughTexPath != null && texData.metroughTexPath != "" )
            pbrMaterial.metallicRoughnessTexture = new Texture( texData.metroughTexPath, scene );

        if ( pbrMaterial.environmentTexture != null )
            pbrMaterial.environmentTexture.dispose();

        // if ( texData.environmentTexPath != null && texData.environmentTexPath != "" )
        //     pbrMaterial.environmentTexture = new Texture( texData.environmentTexPath, scene );

        if ( texData.colorIDTex != null )
            texData.colorIDTex.dispose();

        texData.colorIDTex = new Texture( texData.colorIDTexPath, scene );

        mesh.material = pbrMaterial;
    }
}